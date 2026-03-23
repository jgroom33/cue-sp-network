import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type {
  Topology,
  Device,
  DeviceRole,
  LinkType,
  OverlayType,
  OverlayData,
  OverlayLink,
} from "../types";
import { buildGraph, toConfigKey } from "../utils/graph";
import type { GraphNode, GraphLink } from "../utils/graph";
import { roleColors, linkColors, overlayColors } from "../utils/colors";
import { curvedPath } from "../utils/overlays";
import { buildCloudGroups, cloudPath, cloudLabelPosition } from "../utils/clouds";

interface Props {
  topo: Topology;
  configs: Record<string, Device>;
  selectedDevice: string | null;
  onSelectDevice: (id: string | null) => void;
  visibleRoles: Set<DeviceRole>;
  visibleLinkTypes: Set<LinkType>;
  highlightedDevices: Set<string> | null;
  overlayData: OverlayData;
  activeOverlays: Set<OverlayType>;
  onNodePositionsUpdate?: (positions: Map<string, { x: number; y: number }>) => void;
  educationalOverlay?: React.ReactNode;
}

export default function TopologyGraph({
  topo,
  configs,
  selectedDevice,
  onSelectDevice,
  visibleRoles,
  visibleLinkTypes,
  highlightedDevices,
  overlayData,
  activeOverlays,
  onNodePositionsUpdate,
  educationalOverlay,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const onSelectRef = useRef(onSelectDevice);
  onSelectRef.current = onSelectDevice;
  const selectedRef = useRef(selectedDevice);
  selectedRef.current = selectedDevice;
  const onNodePosRef = useRef(onNodePositionsUpdate);
  onNodePosRef.current = onNodePositionsUpdate;
  const [zoomTransform, setZoomTransform] = useState("translate(0,0) scale(1)");
  const zoomTransformRef = useRef("translate(0,0) scale(1)");

  // Build graph once when topo/configs/overlayData change
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { nodes, links } = buildGraph(topo, configs, width, height);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Zoom container
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        const t = event.transform;
        const str = `translate(${t.x},${t.y}) scale(${t.k})`;
        zoomTransformRef.current = str;
        setZoomTransform(str);
      });
    svg.call(zoom);

    // --- Domain clouds (rendered first = behind everything) ---
    const cloudGroups = buildCloudGroups(topo, configs);
    const cloudGroup = g.append("g").attr("class", "domain-clouds");
    // Create a <g> per cloud with path + label
    const cloudElements = cloudGroups.map((cg) => {
      const cEl = cloudGroup.append("g").attr("class", `cloud-${cg.id}`).attr("opacity", 0);
      const path = cEl
        .append("path")
        .attr("fill", cg.color)
        .attr("fill-opacity", cg.fillOpacity)
        .attr("stroke", cg.color)
        .attr("stroke-opacity", 0.25)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "6,3");
      const label = cEl
        .append("text")
        .text(cg.label)
        .attr("fill", cg.color)
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("opacity", 0.5)
        .style("pointer-events", "none");
      return { group: cg, path, label };
    });

    // Arrow markers
    const defs = svg.append("defs");
    (["core", "edge", "customer", "peering"] as LinkType[]).forEach((lt) => {
      defs
        .append("marker")
        .attr("id", `arrow-${lt}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", linkColors[lt]);
    });

    // Tooltip
    const tooltip = d3
      .select(container)
      .append("div")
      .attr(
        "class",
        "absolute pointer-events-none bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 shadow-xl z-50 hidden"
      );

    // --- Physical Links ---
    const linkGroup = g
      .append("g")
      .attr("class", "physical-links")
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => linkColors[d.type as LinkType] || "#4b5563")
      .attr("stroke-width", (d) => (d.type === "core" ? 2.5 : 1.8))
      .attr("stroke-opacity", 0.7)
      .on("mouseover", function (_event, d) {
        d3.select(this).attr("stroke-width", 4).attr("stroke-opacity", 1);
        const src = d.source as GraphNode;
        const tgt = d.target as GraphNode;
        const srcConfig = configs[toConfigKey(d.aDevice)];
        const tgtConfig = configs[toConfigKey(d.zDevice)];
        const srcIface = srcConfig?.interfaces.find(
          (i) => i.name === d.aInterface
        );
        const tgtIface = tgtConfig?.interfaces.find(
          (i) => i.name === d.zInterface
        );

        tooltip.classed("hidden", false).html(
          `<div class="font-semibold mb-1">${d.aDevice}:${d.aInterface} ↔ ${d.zDevice}:${d.zInterface}</div>` +
            `<div>Type: <span class="font-medium">${d.type}</span></div>` +
            (srcIface?.ipv4
              ? `<div>${d.aDevice}: ${srcIface.ipv4}</div>`
              : "") +
            (tgtIface?.ipv4
              ? `<div>${d.zDevice}: ${tgtIface.ipv4}</div>`
              : "") +
            (d.metric ? `<div>Metric: ${d.metric}</div>` : "")
        );

        const x = ((src.x || 0) + (tgt.x || 0)) / 2;
        const y = ((src.y || 0) + (tgt.y || 0)) / 2;
        tooltip.style("left", `${x + 10}px`).style("top", `${y - 10}px`);
      })
      .on("mouseout", function (_event, d) {
        d3.select(this)
          .attr("stroke-width", d.type === "core" ? 2.5 : 1.8)
          .attr("stroke-opacity", 0.7);
        tooltip.classed("hidden", true);
      });

    // --- Link IP overlay ---
    const linkIpGroup = g.append("g").attr("class", "overlay-link-ips");
    const linkIpTexts: {
      aText: d3.Selection<SVGTextElement, unknown, null, undefined>;
      zText: d3.Selection<SVGTextElement, unknown, null, undefined>;
      link: GraphLink;
    }[] = [];
    for (const link of links) {
      const addr = overlayData.linkAddresses[`${link.aDevice}::${link.zDevice}`];
      if (!addr) continue;
      if (addr.aIp) {
        const aText = linkIpGroup
          .append("text")
          .text(addr.aIp)
          .attr("fill", overlayColors["link-ips"])
          .attr("font-size", "8px")
          .attr("font-family", "monospace")
          .attr("text-anchor", "middle")
          .attr("opacity", 0.8)
          .style("pointer-events", "none");
        const zText = linkIpGroup
          .append("text")
          .text(addr.zIp)
          .attr("fill", overlayColors["link-ips"])
          .attr("font-size", "8px")
          .attr("font-family", "monospace")
          .attr("text-anchor", "middle")
          .attr("opacity", 0.8)
          .style("pointer-events", "none");
        linkIpTexts.push({ aText, zText, link });
      }
    }

    // --- BGP overlay paths ---
    const ibgpLinks = overlayData.bgpLinks.filter((l) => l.type === "ibgp");
    const ebgpLinks = overlayData.bgpLinks.filter((l) => l.type === "ebgp");

    const ibgpGroup = g.append("g").attr("class", "overlay-ibgp");
    const ibgpPaths = ibgpGroup
      .selectAll<SVGPathElement, OverlayLink>("path")
      .data(ibgpLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", overlayColors.ibgp)
      .attr("stroke-width", (d) => (d.isRRClient ? 2 : 1.5))
      .attr("stroke-dasharray", "8 4")
      .attr("stroke-opacity", 0.6)
      .on("mouseover", function (_event, d) {
        d3.select(this).attr("stroke-width", 3.5).attr("stroke-opacity", 1);
        tooltip.classed("hidden", false).html(
          `<div class="font-semibold mb-1">iBGP: ${d.source} ↔ ${d.target}</div>` +
            (d.peerGroup
              ? `<div>Peer Group: ${d.peerGroup}</div>`
              : "") +
            `<div>AFIs: ${d.addressFamilies.join(", ")}</div>` +
            (d.isRRClient ? `<div>RR Client</div>` : "") +
            `<div>${d.source}: ${d.sourceLoopback}</div>` +
            `<div>${d.target}: ${d.targetLoopback}</div>`
        );
        const sn = nodeMap.get(d.source);
        const tn = nodeMap.get(d.target);
        if (sn && tn) {
          tooltip
            .style("left", `${((sn.x || 0) + (tn.x || 0)) / 2 + 10}px`)
            .style("top", `${((sn.y || 0) + (tn.y || 0)) / 2 - 10}px`);
        }
      })
      .on("mouseout", function (_event, d) {
        d3.select(this)
          .attr("stroke-width", d.isRRClient ? 2 : 1.5)
          .attr("stroke-opacity", 0.6);
        tooltip.classed("hidden", true);
      });

    const ebgpGroup = g.append("g").attr("class", "overlay-ebgp");
    const ebgpPaths = ebgpGroup
      .selectAll<SVGPathElement, OverlayLink>("path")
      .data(ebgpLinks)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", overlayColors.ebgp)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-opacity", 0.6)
      .on("mouseover", function (_event, d) {
        d3.select(this).attr("stroke-width", 3.5).attr("stroke-opacity", 1);
        tooltip.classed("hidden", false).html(
          `<div class="font-semibold mb-1">eBGP: ${d.source} ↔ ${d.target}</div>` +
            (d.peerGroup
              ? `<div>Peer Group: ${d.peerGroup}</div>`
              : "") +
            `<div>AFIs: ${d.addressFamilies.join(", ")}</div>` +
            `<div>${d.source}: ${d.sourceLoopback}</div>` +
            `<div>${d.target}: ${d.targetLoopback}</div>`
        );
        const sn = nodeMap.get(d.source);
        const tn = nodeMap.get(d.target);
        if (sn && tn) {
          tooltip
            .style("left", `${((sn.x || 0) + (tn.x || 0)) / 2 + 10}px`)
            .style("top", `${((sn.y || 0) + (tn.y || 0)) / 2 - 10}px`);
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 1.5).attr("stroke-opacity", 0.6);
        tooltip.classed("hidden", true);
      });

    // --- SR SID overlay labels ---
    const srGroup = g.append("g").attr("class", "overlay-sr-sids");
    const srEntries = Object.entries(overlayData.srLabels);
    const srTexts = srGroup
      .selectAll<SVGTextElement, [string, { nodeSid: number }]>("text")
      .data(srEntries)
      .join("text")
      .text(([, sr]) => `SID:${sr.nodeSid}`)
      .attr("fill", overlayColors["sr-sids"])
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("text-anchor", "middle")
      .attr("opacity", 0.9)
      .style("pointer-events", "none");

    // --- Loopback overlay labels ---
    const loopbackGroup = g.append("g").attr("class", "overlay-loopbacks");
    const loopbackEntries = nodes
      .filter((n) => topo.loopbacks[n.id])
      .map((n) => ({ node: n, ip: topo.loopbacks[n.id] }));
    const loopbackTexts = loopbackGroup
      .selectAll<SVGTextElement, (typeof loopbackEntries)[0]>("text")
      .data(loopbackEntries)
      .join("text")
      .text((d) => d.ip)
      .attr("fill", overlayColors.loopbacks)
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("text-anchor", "middle")
      .attr("opacity", 0.85)
      .style("pointer-events", "none");

    // --- Nodes (on top of overlays) ---
    const nodeGroup = g
      .append("g")
      .attr("class", "node-group")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        onSelectRef.current(d.id === selectedRef.current ? null : d.id);
      })
      .on("mouseover", function (_event, d) {
        tooltip.classed("hidden", false).html(
          `<div class="font-semibold">${d.hostname}</div>` +
            `<div>Role: ${d.role}</div>` +
            `<div>Router ID: ${d.routerId}</div>` +
            `<div>Loopback: ${d.loopback}</div>`
        );
        tooltip
          .style("left", `${(d.x || 0) + d.radius + 10}px`)
          .style("top", `${(d.y || 0) - 10}px`);
      })
      .on("mouseout", () => tooltip.classed("hidden", true))
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active)
              simulationRef.current?.alphaTarget(0.1).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (_event, d) => {
            d.fx = _event.x;
            d.fy = _event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0);
            // Keep nodes pinned at their dragged position
            d.fx = d.x;
            d.fy = d.y;
          })
      );

    nodeGroup
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => roleColors[d.role])
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    nodeGroup
      .append("text")
      .text((d) => d.hostname)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 14)
      .attr("fill", "#e5e7eb")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .style("pointer-events", "none");

    nodeGroup
      .append("text")
      .text((d) => {
        const icons: Record<DeviceRole, string> = {
          PE: "PE",
          P: "P",
          RR: "RR",
          ASBR: "AS",
          AGG: "AG",
          CE: "CE",
          NID: "NI",
          PCE: "PC",
          EXTERNAL: "EX",
        };
        return icons[d.role];
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#fff")
      .attr("font-size", (d) => `${Math.max(9, d.radius * 0.65)}px`)
      .attr("font-weight", "bold")
      .style("pointer-events", "none");

    // --- Force simulation ---
    // Build BGP sim links for the force (pulls RRs/PCE toward peers)
    interface BgpSimLink {
      source: string;
      target: string;
    }
    const bgpSimLinks: BgpSimLink[] = overlayData.bgpLinks.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    // Static layout: all nodes pinned via fx/fy. Simulation runs
    // only to resolve link source/target references and fire a tick.
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(120)
          .strength(0)
      )
      .force(
        "bgp-links",
        d3
          .forceLink<GraphNode, BgpSimLink>(bgpSimLinks)
          .id((d: { id?: string }) => d.id || "")
          .distance(200)
          .strength(0)
      )
      .alphaDecay(0.3)
      .velocityDecay(0.8)
      .on("tick", () => {
        // Physical links
        linkGroup
          .attr("x1", (d) => (d.source as GraphNode).x || 0)
          .attr("y1", (d) => (d.source as GraphNode).y || 0)
          .attr("x2", (d) => (d.target as GraphNode).x || 0)
          .attr("y2", (d) => (d.target as GraphNode).y || 0);

        // Nodes
        nodeGroup.attr(
          "transform",
          (d) => `translate(${d.x || 0},${d.y || 0})`
        );

        // iBGP overlay curves
        ibgpPaths.attr("d", (d) => {
          const sn = nodeMap.get(d.source);
          const tn = nodeMap.get(d.target);
          if (!sn || !tn) return "";
          return curvedPath(
            sn.x || 0,
            sn.y || 0,
            tn.x || 0,
            tn.y || 0,
            35
          );
        });

        // eBGP overlay curves
        ebgpPaths.attr("d", (d) => {
          const sn = nodeMap.get(d.source);
          const tn = nodeMap.get(d.target);
          if (!sn || !tn) return "";
          return curvedPath(
            sn.x || 0,
            sn.y || 0,
            tn.x || 0,
            tn.y || 0,
            -30
          );
        });

        // SR SID labels — above the node
        srTexts.attr("x", ([devId]) => nodeMap.get(devId)?.x || 0);
        srTexts.attr(
          "y",
          ([devId]) =>
            (nodeMap.get(devId)?.y || 0) -
            (nodeMap.get(devId)?.radius || 18) -
            6
        );

        // Loopback labels — below hostname
        loopbackTexts.attr("x", (d) => d.node.x || 0);
        loopbackTexts.attr(
          "y",
          (d) => (d.node.y || 0) + d.node.radius + 26
        );

        // Link IP labels — at 30%/70% along each physical link
        for (const { aText, zText, link } of linkIpTexts) {
          const src = link.source as GraphNode;
          const tgt = link.target as GraphNode;
          const sx = src.x || 0,
            sy = src.y || 0;
          const tx = tgt.x || 0,
            ty = tgt.y || 0;
          // Offset perpendicular to avoid overlapping the line
          const dx = tx - sx,
            dy = ty - sy;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len,
            ny = dx / len;
          const off = 8;
          aText
            .attr("x", sx + dx * 0.3 + nx * off)
            .attr("y", sy + dy * 0.3 + ny * off);
          zText
            .attr("x", sx + dx * 0.7 + nx * off)
            .attr("y", sy + dy * 0.7 + ny * off);
        }

        // Update domain cloud shapes
        for (const ce of cloudElements) {
          const memberPositions = ce.group.members
            .map((id) => nodeMap.get(id))
            .filter((n): n is GraphNode => !!n)
            .map((n) => ({ x: n.x || 0, y: n.y || 0 }));

          if (memberPositions.length > 0) {
            ce.path.attr("d", cloudPath(memberPositions, 45));
            const labelPos = cloudLabelPosition(memberPositions, 45);
            ce.label.attr("x", labelPos.x).attr("y", labelPos.y);
          }
        }

        // Report node positions for educational overlay
        if (onNodePosRef.current) {
          const positions = new Map<string, { x: number; y: number }>();
          for (const n of nodes) {
            positions.set(n.id, { x: n.x || 0, y: n.y || 0 });
          }
          onNodePosRef.current(positions);
        }
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [topo, configs, overlayData]);

  // Update visibility/highlight/selection styles
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Node visibility
    svg
      .selectAll<SVGGElement, GraphNode>(".node-group g")
      .attr("opacity", (d) => {
        if (!visibleRoles.has(d.role)) return 0.08;
        if (highlightedDevices && !highlightedDevices.has(d.id)) return 0.15;
        return 1;
      });

    // Physical link visibility
    svg
      .selectAll<SVGLineElement, GraphLink>(".physical-links line")
      .attr("opacity", (d) => {
        if (!visibleLinkTypes.has(d.type as LinkType)) return 0.05;
        const src = d.source as GraphNode;
        const tgt = d.target as GraphNode;
        if (!visibleRoles.has(src.role) || !visibleRoles.has(tgt.role))
          return 0.05;
        if (
          highlightedDevices &&
          !highlightedDevices.has(src.id) &&
          !highlightedDevices.has(tgt.id)
        )
          return 0.08;
        return 0.7;
      });

    // Selected node highlight
    svg
      .selectAll<SVGCircleElement, GraphNode>("circle")
      .attr("stroke-width", (d) => (d.id === selectedDevice ? 4 : 2))
      .attr("stroke", (d) =>
        d.id === selectedDevice ? "#fbbf24" : "#fff"
      );

    // Overlay visibility
    svg
      .select(".overlay-ibgp")
      .attr("opacity", activeOverlays.has("ibgp") ? 1 : 0)
      .style("pointer-events", activeOverlays.has("ibgp") ? "auto" : "none");
    svg
      .select(".overlay-ebgp")
      .attr("opacity", activeOverlays.has("ebgp") ? 1 : 0)
      .style("pointer-events", activeOverlays.has("ebgp") ? "auto" : "none");
    svg
      .select(".overlay-sr-sids")
      .attr("opacity", activeOverlays.has("sr-sids") ? 1 : 0);
    svg
      .select(".overlay-link-ips")
      .attr("opacity", activeOverlays.has("link-ips") ? 1 : 0);
    svg
      .select(".overlay-loopbacks")
      .attr("opacity", activeOverlays.has("loopbacks") ? 1 : 0);

    // Cloud overlay visibility
    svg.select(".cloud-isis-domain").attr("opacity", activeOverlays.has("cloud-isis") ? 1 : 0);
    svg.select(".cloud-bgp-mesh").attr("opacity", activeOverlays.has("cloud-bgp") ? 1 : 0);
    svg.select(".cloud-vxlan-vteps").attr("opacity", activeOverlays.has("cloud-vxlan") ? 1 : 0);
    svg.select(".cloud-erps-ring").attr("opacity", activeOverlays.has("cloud-erps") ? 1 : 0);
    svg.select(".cloud-l2vpn-service").attr("opacity", activeOverlays.has("cloud-l2vpn") ? 1 : 0);
  }, [
    visibleRoles,
    visibleLinkTypes,
    highlightedDevices,
    selectedDevice,
    activeOverlays,
  ]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: "600px" }}
      />
      {/* Educational animation overlay — same coordinate space as D3 graph */}
      {educationalOverlay && (
        <svg
          className="w-full h-full absolute inset-0 pointer-events-none"
          style={{ minHeight: "600px" }}
        >
          <g transform={zoomTransform}>
            {educationalOverlay}
          </g>
        </svg>
      )}
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg p-3 text-xs">
        <div className="font-semibold mb-2 text-gray-300">Roles</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(Object.entries(roleColors) as [DeviceRole, string][]).map(
            ([role, color]) => (
              <div key={role} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-400">{role}</span>
              </div>
            )
          )}
        </div>
        <div className="font-semibold mt-2 mb-1 text-gray-300">Links</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(Object.entries(linkColors) as [LinkType, string][]).map(
            ([lt, color]) => (
              <div key={lt} className="flex items-center gap-1.5">
                <div
                  className="w-4 h-0.5"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-400">{lt}</span>
              </div>
            )
          )}
        </div>
        {activeOverlays.size > 0 && (
          <>
            <div className="font-semibold mt-2 mb-1 text-gray-300">
              Overlays
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {activeOverlays.has("ibgp") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-0 border-t border-dashed"
                    style={{ borderColor: overlayColors.ibgp }}
                  />
                  <span className="text-gray-400">iBGP</span>
                </div>
              )}
              {activeOverlays.has("ebgp") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-0 border-t border-dashed"
                    style={{ borderColor: overlayColors.ebgp }}
                  />
                  <span className="text-gray-400">eBGP</span>
                </div>
              )}
              {activeOverlays.has("sr-sids") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded text-center leading-3 font-mono"
                    style={{
                      color: overlayColors["sr-sids"],
                      fontSize: "7px",
                    }}
                  >
                    SID
                  </div>
                  <span className="text-gray-400">SR SIDs</span>
                </div>
              )}
              {activeOverlays.has("loopbacks") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: overlayColors.loopbacks,
                      opacity: 0.5,
                    }}
                  />
                  <span className="text-gray-400">Loopbacks</span>
                </div>
              )}
              {activeOverlays.has("link-ips") && (
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: overlayColors["link-ips"],
                      opacity: 0.5,
                    }}
                  />
                  <span className="text-gray-400">Link IPs</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
