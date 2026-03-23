import type { Topology, Device } from "../types";
import type {
  PacketState,
  PacketHeaders,
  PacketAction,
  MplsLabel,
  ComputedScenario,
  ScenarioDefinition,
  PathLink,
} from "./types";
import {
  buildAdjacencyGraph,
  dijkstra,
  resolveSegmentList,
} from "./pathfinding";
import type { PathResult } from "./pathfinding";

/**
 * Main entry: given a scenario definition + network data, compute the full
 * sequence of PacketStates (one per hop).
 */
export function computeScenario(
  scenario: ScenarioDefinition,
  topo: Topology,
  configs: Record<string, Device>,
  disabledLinks: Set<string> = new Set()
): ComputedScenario | null {
  const graph = buildAdjacencyGraph(topo, configs, disabledLinks, true);

  let pathResult: PathResult | null = null;

  if (scenario.explicitPath && scenario.category === "sr-te") {
    // SR-TE: use the explicit segment list from the SR policy
    const pe1Policy = configs.pe1?.sr_policy_config;
    if (pe1Policy?.enabled) {
      const policy = pe1Policy.policies?.find((p: { name: string }) =>
        p.name.includes("low-latency")
      );
      if (policy?.candidate_paths?.[0]?.segment_lists?.[0]?.segments) {
        const segments = policy.candidate_paths[0].segment_lists[0].segments;
        pathResult = resolveSegmentList(
          segments,
          configs,
          graph,
          scenario.sourceDevice
        );
      }
    }
    // Fallback to explicit path
    if (!pathResult) {
      pathResult = buildExplicitPathResult(scenario.explicitPath, graph);
    }
  } else if (scenario.explicitPath) {
    // BGP RR scenario: explicit path through control plane
    pathResult = buildExplicitPathResult(scenario.explicitPath, graph);
  } else {
    pathResult = dijkstra(graph, scenario.sourceDevice, scenario.destDevice);
  }

  if (!pathResult) return null;

  const pathLinks = buildPathLinks(pathResult);
  const packetStates = computePacketStates(
    scenario,
    pathResult,
    topo,
    configs
  );

  return {
    definition: scenario,
    path: pathResult.path,
    pathLinks,
    packetStates,
  };
}

function buildExplicitPathResult(
  path: string[],
  graph: ReturnType<typeof buildAdjacencyGraph>
): PathResult {
  const interfaces: { device: string; ingress: string; egress: string }[] = [];

  for (let i = 0; i < path.length; i++) {
    let ingress = "";
    let egress = "";

    if (i > 0) {
      const adj = graph
        .get(path[i - 1])
        ?.find((a) => a.neighbor === path[i]);
      if (adj) ingress = adj.zInterface;
    }
    if (i < path.length - 1) {
      const adj = graph
        .get(path[i])
        ?.find((a) => a.neighbor === path[i + 1]);
      if (adj) egress = adj.aInterface;
    }

    interfaces.push({ device: path[i], ingress, egress });
  }

  return { path, interfaces };
}

function buildPathLinks(pathResult: PathResult): PathLink[] {
  const links: PathLink[] = [];
  for (let i = 0; i < pathResult.path.length - 1; i++) {
    links.push({
      source: pathResult.path[i],
      target: pathResult.path[i + 1],
      sourceInterface: pathResult.interfaces[i].egress,
      targetInterface: pathResult.interfaces[i + 1].ingress,
    });
  }
  return links;
}

// Helper: look up SID label for a device
function getNodeSidLabel(
  configs: Record<string, Device>,
  targetDevice: string
): number {
  const key = targetDevice.replace(/-/g, "_");
  const config = configs[key] ?? configs[targetDevice];
  const sr = config?.sr_config;
  if (!sr?.enabled) return 3; // implicit null
  const srgbStart = sr.srgb?.start ?? 16000;
  const index = sr.node_sids?.[0]?.index ?? 0;
  return srgbStart + index;
}

// Helper: look up VXLAN config
function getVxlanConfig(configs: Record<string, Device>, device: string) {
  const key = device.replace(/-/g, "_");
  const config = configs[key] ?? configs[device];
  return config?.vxlan_config;
}

// Helper: get loopback IP
function getLoopback(topo: Topology, device: string): string {
  return topo.loopbacks?.[device] ?? "0.0.0.0";
}

// Helper: get VTEP IP
function getVtepIp(topo: Topology, device: string): string {
  return topo.vtep_loopbacks?.[device] ?? getLoopback(topo, device);
}

// Helper: classify DSCP to QoS class
function classifyDscp(
  configs: Record<string, Device>,
  device: string,
  dscp: string
): { fwdClass: string; queueId: number } | null {
  const key = device.replace(/-/g, "_");
  const config = configs[key] ?? configs[device];
  const qos = config?.qos_config;
  if (!qos?.enabled) return null;

  for (const fc of qos.forwarding_classes ?? []) {
    if (fc.dscp_match?.includes(dscp)) {
      return { fwdClass: fc.name, queueId: fc.queue_id };
    }
  }
  return { fwdClass: "best-effort", queueId: 0 };
}

// Helper: synthetic VPN label (educational approximation)
function getVpnLabel(_device: string, vpnIndex: number): number {
  return 100001 + vpnIndex;
}


/**
 * Compute packet states for each hop in the path.
 */
function computePacketStates(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  switch (scenario.id) {
    case "simple-ip-forwarding":
      return computeSimpleIP(scenario, pathResult, topo, configs);
    case "l3vpn-ce-to-ce":
      return computeL3VPN(scenario, pathResult, topo, configs);
    case "l2vpn-pseudowire":
    case "mef-all-to-one":
    case "mef-many-to-one":
    case "mef-one-to-one":
      return computeL2VPN(scenario, pathResult, topo, configs);
    case "mef-enni-enni":
    case "mef-enni-uni":
      return computeENNI(scenario, pathResult, topo, configs);
    case "vxlan-ingress-replication":
      return computeVXLAN(scenario, pathResult, topo, configs);
    case "sr-te-low-latency":
      return computeSRTE(scenario, pathResult, topo, configs);
    case "bgp-route-reflection":
      return computeBGPRR(scenario, pathResult, topo, configs);
    case "tilfa-failover":
      return computeL3VPN(scenario, pathResult, topo, configs); // Same as L3VPN with different path
    case "internet-transit":
      return computeInternet(scenario, pathResult, topo, configs);
    default:
      return computeL3VPN(scenario, pathResult, topo, configs);
  }
}

function deepCloneHeaders(h: PacketHeaders): PacketHeaders {
  return JSON.parse(JSON.stringify(h));
}

/**
 * Simple IP Forwarding: no MPLS, just hop-by-hop IP forwarding with TTL decrement and MAC rewrite.
 */
function computeSimpleIP(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  _configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];
  const dscp = scenario.initialDscp ?? "be";

  const srcLoopback = getLoopback(topo, path[0]);
  const dstLoopback = getLoopback(topo, path[path.length - 1]);

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: `00:${path[0].slice(0, 2)}:00:00:00:01`,
      dstMac: `00:${path[1]?.slice(0, 2) ?? "xx"}:00:00:00:01`,
      etherType: "0x0800",
    },
    ip: {
      src: srcLoopback,
      dst: dstLoopback,
      ttl: 64,
      dscp,
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (i === 0) {
      actions.push({ type: "ip-lookup", result: `Route to ${headers.ip!.dst} via next hop` });
      annotation =
        "The source device looks up the destination IP address in its routing table. " +
        "The routing table says the next hop is reachable via the directly connected interface. " +
        "The device builds an Ethernet frame with its own MAC as source and the next-hop's MAC as destination, " +
        "then places the IP packet inside. This is Layer 3 (IP) riding on top of Layer 2 (Ethernet).";
    } else if (i === path.length - 1) {
      actions.push({ type: "ip-lookup", result: "Destination reached — deliver locally" });
      annotation =
        "The packet has arrived at its destination. Notice that throughout the journey: " +
        "(1) the IP source and destination addresses never changed — they identify the endpoints, " +
        "(2) the Ethernet MAC addresses changed at every hop — they identify the current and next device, " +
        "(3) the TTL decreased at each hop — preventing infinite loops. " +
        "This is the foundation of IP networking. More advanced scenarios add MPLS labels on top of this basic forwarding.";
    } else {
      // Intermediate hop: IP forward
      if (headers.ip) {
        const oldTtl = headers.ip.ttl;
        headers.ip.ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }
      actions.push({ type: "ip-lookup", result: `Route to ${headers.ip!.dst} → forward to ${path[i + 1]}` });
      actions.push({ type: "forward", outInterface: iface.egress });

      headers.ethernet!.srcMac = `00:${dev.slice(0, 2)}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1]?.slice(0, 2) ?? "xx"}:00:00:00:01`;

      annotation =
        `Router ${dev} receives the packet on ${iface.ingress || "its interface"}. It: ` +
        `(1) strips the Ethernet header (Layer 2 is hop-by-hop), ` +
        `(2) decrements the TTL from ${(headers.ip?.ttl ?? 0) + 1} to ${headers.ip?.ttl ?? 0} (each router subtracts 1 to prevent loops), ` +
        `(3) looks up ${headers.ip?.dst} in its routing table to find the next hop, ` +
        `(4) builds a new Ethernet header with its own MAC as source and ${path[i + 1]}'s MAC as destination, ` +
        `then sends the packet out ${iface.egress || "the outgoing interface"}. The IP header stays the same (except TTL) — only the Ethernet header changes per hop.`;
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

/**
 * L3VPN CE-to-CE: push VPN+transport at ingress PE, swap transport at P, PHP+VPN pop at egress PE
 */
function computeL3VPN(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];
  const dscp = scenario.initialDscp ?? "ef";

  // Find the ingress PE and egress PE (first and last SP devices)
  const ingressPeIdx = path.findIndex(
    (d) => topo.device_roles?.[d] === "PE"
  );
  const egressPeIdx = findLastIndex(
    path,
    (d) => topo.device_roles?.[d] === "PE"
  );
  // Egress PE's destination is the last device — get the transport SID for it
  const egressPe = path[egressPeIdx];
  const transportLabel = getNodeSidLabel(configs, egressPe);
  const vpnLabel = getVpnLabel(egressPe, 0);

  // Derive source/dest IPs from the scenario endpoints
  const srcDevice = path[0];
  const dstDevice = path[path.length - 1];
  const srcLoopback = getLoopback(topo, srcDevice);
  const dstLoopback = getLoopback(topo, dstDevice);

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: `00:${srcDevice.slice(0, 2)}:00:00:00:01`,
      dstMac: `00:${path[1]?.slice(0, 2) ?? "xx"}:00:00:00:01`,
      etherType: "0x0800",
    },
    ip: {
      src: srcLoopback,
      dst: dstLoopback,
      ttl: 64,
      dscp,
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "CE";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (role === "CE" && i === 0) {
      // Source CE
      actions.push({ type: "ip-lookup", result: `Route to ${headers.ip!.dst} via PE` });
      annotation =
        "Customer device sends IP packet toward the SP network. No MPLS labels yet — this is a plain IP packet.";
    } else if (role === "PE" && i === ingressPeIdx) {
      // Ingress PE: VRF lookup → push VPN label + transport label
      actions.push({
        type: "ip-lookup",
        result: `VRF lookup: ${headers.ip!.dst} → next-hop ${getLoopback(topo, egressPe)}`,
      });

      // QoS classification at ingress
      const qos = classifyDscp(configs, dev, dscp);
      if (qos) {
        actions.push({
          type: "qos-classify",
          dscp,
          fwdClass: qos.fwdClass,
        });
        actions.push({
          type: "qos-police",
          result: "conform",
          action: "transmit",
        });
      }

      // Push VPN label (bottom of stack)
      const vpnMpls: MplsLabel = {
        value: vpnLabel,
        ttl: 63,
        tc: qos?.queueId ?? 0,
        bottom: true,
        purpose: "VPN Label (L3VPN service)",
      };
      actions.push({ type: "mpls-push", label: vpnMpls });

      // Push transport label (top of stack)
      const transportMpls: MplsLabel = {
        value: transportLabel,
        ttl: 63,
        tc: qos?.queueId ?? 0,
        bottom: false,
        purpose: `Transport (Node SID ${transportLabel} → ${egressPe})`,
      };
      actions.push({ type: "mpls-push", label: transportMpls });

      headers.mpls = [transportMpls, vpnMpls];
      headers.ethernet!.srcMac = `00:${dev}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1]}:00:00:00:01`;
      headers.ethernet!.etherType = "0x8847"; // MPLS

      annotation =
        `Ingress PE performs VRF lookup, then pushes a two-label MPLS stack: transport label ${transportLabel} (routes to ${egressPe} via SR) and VPN label ${vpnLabel} (identifies the VPN service). QoS classifies the packet as "${qos?.fwdClass ?? "best-effort"}".`;
    } else if (role === "P" || role === "RR") {
      // P router: swap transport label, decrement TTL
      const oldLabel = headers.mpls?.[0]?.value ?? transportLabel;
      const isPenultimateHop = i === egressPeIdx - 1;

      if (isPenultimateHop) {
        // PHP: pop transport label, expose VPN label
        actions.push({ type: "php-pop", label: oldLabel });
        if (headers.mpls && headers.mpls.length > 1) {
          headers.mpls = [{ ...headers.mpls[1], bottom: true }];
        }
        annotation =
          `Penultimate Hop Popping (PHP): this P router is one hop before the egress PE, so it pops the transport label ${oldLabel}. The VPN label is now exposed at the top of the stack. This allows the egress PE to do a single label lookup instead of two.`;
      } else {
        // Normal swap
        const newLabel = transportLabel; // In a real network, each hop would have a different label
        actions.push({ type: "mpls-swap", from: oldLabel, to: newLabel });
        if (headers.mpls) {
          headers.mpls[0] = { ...headers.mpls[0], value: newLabel };
        }
        annotation =
          `P router performs MPLS label swap: ${oldLabel} → ${newLabel}. The P router only looks at the top label — it has no knowledge of the VPN label beneath or the customer IP packet inside. This is the power of label switching: core routers need minimal state.`;
      }

      // TTL decrement
      if (headers.mpls?.[0]) {
        const oldTtl = headers.mpls[0].ttl;
        headers.mpls[0].ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }

      headers.ethernet!.srcMac = `00:${dev}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1]}:00:00:00:01`;
    } else if (role === "PE" && i === egressPeIdx) {
      // Egress PE: pop VPN label, IP lookup, forward to CE
      if (headers.mpls?.length) {
        actions.push({ type: "vpn-label-pop", label: headers.mpls[0].value });
      }
      headers.mpls = undefined;
      headers.ethernet!.etherType = "0x0800"; // Back to IP

      actions.push({
        type: "ip-lookup",
        result: `VRF lookup: ${headers.ip!.dst} → forward to CE`,
      });

      // TTL decrement on IP
      if (headers.ip) {
        const oldTtl = headers.ip.ttl;
        headers.ip.ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }

      headers.ethernet!.srcMac = `00:${dev}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1] ?? "ce"}:00:00:00:01`;

      annotation =
        `Egress PE pops the VPN label ${vpnLabel}, performs a VRF route lookup, and forwards the original IP packet toward the destination CE. The MPLS domain is complete — the packet is now plain IP again.`;
    } else if (role === "AGG") {
      // AGG switch: L2 forwarding
      if (headers.ip) {
        const oldTtl = headers.ip.ttl;
        headers.ip.ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }
      actions.push({ type: "forward", outInterface: iface.egress });
      headers.ethernet!.srcMac = `00:${dev}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1] ?? "ce"}:00:00:00:01`;
      annotation =
        "Aggregation switch forwards the IP packet toward the destination CE device.";
    } else if (role === "CE" && i === path.length - 1) {
      // Destination CE: receive
      actions.push({
        type: "ip-lookup",
        result: "Destination reached — deliver to application",
      });
      annotation =
        "Destination CE receives the original IP packet. The customer is unaware that MPLS was used to transport the packet across the service provider backbone.";
    }

    const qosInfo = classifyDscp(configs, dev, dscp);

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      qosClass: qosInfo?.fwdClass,
      qosAction: "transmit",
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

/**
 * L2VPN Pseudowire (VPWS): pe1 → P core → pe2
 * Transparent L2 frame transport with PW label + transport label
 */
function computeL2VPN(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];

  // Find ingress/egress PE indices
  const ingressPeIdx = path.findIndex(
    (d) => topo.device_roles?.[d] === "PE"
  );
  const egressPeIdx = findLastIndex(
    path,
    (d) => topo.device_roles?.[d] === "PE"
  );
  const ingressPe = path[ingressPeIdx];
  const egressPe = path[egressPeIdx];

  // Look up PW config from ingress PE
  const peKey = ingressPe.replace(/-/g, "_");
  const peConfig = configs[peKey] ?? configs[ingressPe];
  const vpws = peConfig?.l2vpn_config?.vpws?.[0];
  const pwId = vpws?.pseudowire?.pw_id ?? 1001;
  const hasControlWord = vpws?.pseudowire?.control_word ?? true;
  const transportLabel = getNodeSidLabel(configs, egressPe);
  const pwLabel = pwId;

  // MEF service VLAN used by NIDs
  const serviceVlan = 100;

  // Look up NID MEF config for bandwidth info
  const ingressNidIdx = path.findIndex(
    (d) => topo.device_roles?.[d] === "NID"
  );
  const egressNidIdx = findLastIndex(
    path,
    (d) => topo.device_roles?.[d] === "NID"
  );

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: "00:cu:st:aa:00:01",
      dstMac: "00:cu:st:bb:00:01",
      etherType: "0x0800",
    },
    ip: {
      src: "172.16.1.10",
      dst: "172.16.1.20",
      ttl: 64,
      dscp: "be",
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "CE";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (role === "CE" && i === 0) {
      // Source CE: sends untagged Ethernet frame
      actions.push({
        type: "forward",
        outInterface: iface.egress || "eth1",
      });
      annotation =
        "Customer device sends an untagged Ethernet frame toward the provider network. The CE has no knowledge of the L2VPN service — it simply sends traffic to its directly connected interface.";
    } else if (role === "NID" && i === ingressNidIdx) {
      // Ingress NID: MEF UNI — classify, police, VLAN mapping
      const nidKey = dev.replace(/-/g, "_");
      const nidConfig = configs[nidKey] ?? configs[dev];
      const uni = (nidConfig?.mef_config as { unis?: { uni_id: string; bandwidth_profile?: { cir: number } }[] })?.unis?.[0];
      const cir = uni?.bandwidth_profile?.cir ?? 100000;
      const cirStr = cir >= 1000 ? cir / 1000 + " Mbps" : cir + " kbps";
      const bt = scenario.bundlingType;

      actions.push({
        type: "cos-map",
        from: "PCP 0 (untagged)",
        to: "best-effort (green)",
      });
      actions.push({
        type: "mef-police",
        cir: cirStr,
        result: "conform",
        action: "transmit",
      });

      if (bt === "all-to-one") {
        actions.push({ type: "qinq-push", svlan: serviceVlan });
        headers.ethernet!.sVlan = serviceVlan;
        headers.ethernet!.etherType = "0x88a8";
        annotation =
          `Ingress NID (${dev}) — **All-to-One Bundling**: All customer C-VLANs (10, 20, 30) are mapped to a single EVC and tagged with S-VLAN ${serviceVlan}. This is the simplest bundling model — the NID treats the entire port as one service instance regardless of customer VLAN. Bandwidth profiling at CIR ${cirStr} applies to the aggregate traffic.`;
      } else if (bt === "many-to-one") {
        actions.push({ type: "cos-map", from: "C-VLAN 10,20", to: "EVC-A → S-VLAN 100" });
        actions.push({ type: "cos-map", from: "C-VLAN 30", to: "EVC-B → S-VLAN 200" });
        actions.push({ type: "qinq-push", svlan: serviceVlan });
        headers.ethernet!.sVlan = serviceVlan;
        headers.ethernet!.etherType = "0x88a8";
        annotation =
          `Ingress NID (${dev}) — **Many-to-One Bundling**: Customer C-VLANs are grouped into two EVCs: VLANs 10+20 → EVC-A (S-VLAN 100), VLAN 30 → EVC-B (S-VLAN 200). This allows differentiated treatment per VLAN group — e.g., voice/video on EVC-A with strict priority, data on EVC-B with weighted-fair queuing. Each EVC can have its own bandwidth profile.`;
      } else if (bt === "one-to-one") {
        actions.push({ type: "cos-map", from: "C-VLAN 10", to: "EVC-1 → S-VLAN 100" });
        actions.push({ type: "cos-map", from: "C-VLAN 20", to: "EVC-2 → S-VLAN 200" });
        actions.push({ type: "cos-map", from: "C-VLAN 30", to: "EVC-3 → S-VLAN 300" });
        actions.push({ type: "qinq-push", svlan: serviceVlan });
        headers.ethernet!.sVlan = serviceVlan;
        headers.ethernet!.etherType = "0x88a8";
        annotation =
          `Ingress NID (${dev}) — **1:1 VLAN Bundling**: Each customer C-VLAN maps to its own dedicated EVC: VLAN 10 → S-VLAN 100, VLAN 20 → S-VLAN 200, VLAN 30 → S-VLAN 300. Maximum isolation — each VLAN gets independent bandwidth profiling, CoS treatment, and OAM monitoring. This is the most granular MEF bundling model.`;
      } else {
        // Default: standard L2VPN pseudowire
        actions.push({ type: "qinq-push", svlan: serviceVlan });
        headers.ethernet!.sVlan = serviceVlan;
        headers.ethernet!.etherType = "0x88a8";
        annotation =
          `Ingress NID (${dev}) is the provider-owned demarcation device at the customer site (MEF UNI-N). It performs: (1) CoS classification, (2) MEF bandwidth profiling at CIR ${cirStr}, and (3) S-VLAN ${serviceVlan} push for the provider's EVC. Service OAM (Y.1731 CCM) runs between this MEP and the far-end NID.`;
      }
    } else if (role === "PE" && i === ingressPeIdx) {
      // Ingress PE: strip S-VLAN, push PW label + transport label
      actions.push({ type: "qinq-pop", svlan: serviceVlan });
      headers.ethernet!.sVlan = undefined;

      const pwMpls: MplsLabel = {
        value: pwLabel,
        ttl: 255,
        tc: 0,
        bottom: true,
        purpose: `PW Label (Pseudowire ID ${pwId})`,
      };
      const transportMpls: MplsLabel = {
        value: transportLabel,
        ttl: 63,
        tc: 0,
        bottom: false,
        purpose: `Transport (Node SID ${transportLabel} → ${egressPe})`,
      };

      actions.push({ type: "mpls-push", label: pwMpls });
      actions.push({ type: "mpls-push", label: transportMpls });

      headers.mpls = [transportMpls, pwMpls];
      headers.pseudowire = { pwLabel, controlWord: hasControlWord };
      headers.ethernet!.etherType = "0x8847";

      annotation =
        `Ingress PE (${dev}) receives the S-VLAN-tagged frame from the NID, pops the service VLAN ${serviceVlan} (the EVC tag stays within the access network), and encapsulates the original frame into a pseudowire. A two-label MPLS stack is pushed: transport label ${transportLabel} (SR-MPLS path to ${egressPe}) and PW label ${pwLabel} (pseudowire service identifier). ${hasControlWord ? "A control word provides sequencing and padding." : ""}`;
    } else if (role === "P") {
      // P router: MPLS swap
      const isPenultimateHop = i === egressPeIdx - 1;

      if (isPenultimateHop && headers.mpls?.length) {
        actions.push({ type: "php-pop", label: headers.mpls[0].value });
        if (headers.mpls.length > 1) {
          headers.mpls = [{ ...headers.mpls[1], bottom: true }];
        }
        annotation =
          `Penultimate Hop Popping (PHP): P router ${dev} pops the transport label, exposing the PW label ${pwLabel}. The egress PE will use the PW label to identify which pseudowire this frame belongs to.`;
      } else if (headers.mpls?.length) {
        const oldLabel = headers.mpls[0].value;
        actions.push({ type: "mpls-swap", from: oldLabel, to: transportLabel });
        headers.mpls[0] = { ...headers.mpls[0], value: transportLabel };
        const oldTtl = headers.mpls[0].ttl;
        headers.mpls[0].ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
        annotation =
          `P router ${dev} swaps the transport label. Like L3VPN, the P router has no visibility into the pseudowire — it only processes the top MPLS label. The customer's L2 frame is completely opaque to the core.`;
      }

      headers.ethernet!.srcMac = `00:${dev}:00:00:00:01`;
      headers.ethernet!.dstMac = `00:${path[i + 1]}:00:00:00:01`;
    } else if (role === "PE" && i === egressPeIdx) {
      // Egress PE: pop PW label, push S-VLAN for egress NID
      if (headers.mpls?.length) {
        actions.push({ type: "vpn-label-pop", label: headers.mpls[0].value });
      }
      headers.mpls = undefined;
      headers.pseudowire = undefined;

      actions.push({ type: "qinq-push", svlan: serviceVlan });
      headers.ethernet!.sVlan = serviceVlan;
      headers.ethernet!.etherType = "0x88a8";

      actions.push({ type: "forward", outInterface: "eth4" });

      annotation =
        `Egress PE (${dev}) pops the PW label ${pwLabel}, recovering the original customer Ethernet frame. It then pushes S-VLAN ${serviceVlan} for delivery to the egress NID over the access network. The frame's MAC addresses and payload are preserved end-to-end.`;
    } else if (role === "NID" && i === egressNidIdx) {
      // Egress NID: pop S-VLAN, deliver to CE
      actions.push({ type: "qinq-pop", svlan: serviceVlan });
      headers.ethernet!.sVlan = undefined;
      headers.ethernet!.etherType = "0x0800";

      actions.push({ type: "forward", outInterface: "eth1" });

      annotation =
        `Egress NID (${dev}) pops the service S-VLAN ${serviceVlan} and delivers the original untagged Ethernet frame to the customer (CE). The end-to-end MEF E-Line service is complete — the customer receives exactly what was sent, with the provider network completely transparent. Service OAM (Y.1731) between the two NIDs confirms end-to-end connectivity and SLA compliance.`;
    } else if (role === "CE" && i === path.length - 1) {
      // Destination CE: receive
      actions.push({
        type: "ip-lookup",
        result: "Destination reached — deliver to application",
      });
      annotation =
        "Destination CE receives the original Ethernet frame. The L2VPN pseudowire transported it transparently across the provider backbone — the customer is unaware of the MPLS core, the MEF bandwidth profiling, or the S-VLAN tagging used in the access network.";
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

/**
 * ENNI scenarios: inter-carrier E-Line (ENNI-ENNI) or wholesale (ENNI-UNI)
 */
function computeENNI(
  _scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];
  const serviceVlan = 500; // ENNI service VLAN

  // Find PE and NID indices
  const ingressPeIdx = path.findIndex((d) => topo.device_roles?.[d] === "PE");
  const egressPeIdx = findLastIndex(path, (d) => topo.device_roles?.[d] === "PE");
  const egressPe = path[egressPeIdx];
  const transportLabel = getNodeSidLabel(configs, egressPe);
  const pwLabel = 2001; // ENNI PW

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: "00:ca:rr:aa:00:01",
      dstMac: "00:ca:rr:bb:00:01",
      etherType: "0x88a8",
      sVlan: 800, // Partner carrier's S-VLAN
    },
    ip: {
      src: "172.20.1.10",
      dst: "172.20.1.20",
      ttl: 64,
      dscp: "be",
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "NID";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    const nidKey = dev.replace(/-/g, "_");
    const nidConfig = configs[nidKey] ?? configs[dev];
    const isEnni = nidConfig?.mef_config?.unis?.[0]?.uni_type === "ENNI";

    if (role === "NID" && i === 0 && isEnni) {
      // Ingress ENNI: S-VLAN translation (partner S-VLAN → local S-VLAN)
      actions.push({ type: "qinq-pop", svlan: 800 });
      actions.push({ type: "cos-map", from: "Partner S-VLAN 800", to: "Local S-VLAN " + serviceVlan });
      actions.push({ type: "qinq-push", svlan: serviceVlan });
      actions.push({
        type: "mef-police",
        cir: "1 Gbps",
        result: "conform",
        action: "transmit",
      });

      headers.ethernet!.sVlan = serviceVlan;

      annotation =
        `Ingress ENNI (${dev}) is the inter-carrier boundary device. It performs S-VLAN translation: the partner carrier's S-VLAN 800 is popped and replaced with the local carrier's S-VLAN ${serviceVlan}. Bandwidth policing at the ENNI enforces the inter-carrier SLA (CIR 1 Gbps). Service OAM runs at MD level 2 (lower than UNI level 4) to monitor the ENNI segment independently.`;
    } else if (role === "PE" && i === ingressPeIdx) {
      // Ingress PE: strip S-VLAN, push PW + transport
      actions.push({ type: "qinq-pop", svlan: serviceVlan });
      headers.ethernet!.sVlan = undefined;

      const pwMpls: MplsLabel = { value: pwLabel, ttl: 255, tc: 0, bottom: true, purpose: `PW Label (ENNI PW ${pwLabel})` };
      const transportMpls: MplsLabel = { value: transportLabel, ttl: 63, tc: 0, bottom: false, purpose: `Transport (Node SID ${transportLabel} → ${egressPe})` };

      actions.push({ type: "mpls-push", label: pwMpls });
      actions.push({ type: "mpls-push", label: transportMpls });

      headers.mpls = [transportMpls, pwMpls];
      headers.pseudowire = { pwLabel, controlWord: true };
      headers.ethernet!.etherType = "0x8847";

      annotation =
        `Ingress PE (${dev}) pops the S-VLAN ${serviceVlan} from the ENNI access network and encapsulates the frame into a pseudowire for MPLS transport. Transport label ${transportLabel} routes to ${egressPe}, PW label ${pwLabel} identifies the inter-carrier EVC.`;
    } else if (role === "P") {
      const isPenultimateHop = i === egressPeIdx - 1;
      if (isPenultimateHop && headers.mpls?.length) {
        actions.push({ type: "php-pop", label: headers.mpls[0].value });
        if (headers.mpls.length > 1) headers.mpls = [{ ...headers.mpls[1], bottom: true }];
        annotation = `PHP: P router ${dev} pops the transport label, exposing PW label ${pwLabel}.`;
      } else if (headers.mpls?.length) {
        const oldLabel = headers.mpls[0].value;
        actions.push({ type: "mpls-swap", from: oldLabel, to: transportLabel });
        headers.mpls[0] = { ...headers.mpls[0], value: transportLabel };
        const oldTtl = headers.mpls[0].ttl;
        headers.mpls[0].ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
        annotation = `P router ${dev} swaps the transport label — no visibility into the ENNI service payload.`;
      }
    } else if (role === "PE" && i === egressPeIdx) {
      // Egress PE
      if (headers.mpls?.length) {
        actions.push({ type: "vpn-label-pop", label: headers.mpls[0].value });
      }
      headers.mpls = undefined;
      headers.pseudowire = undefined;

      actions.push({ type: "qinq-push", svlan: serviceVlan });
      headers.ethernet!.sVlan = serviceVlan;
      headers.ethernet!.etherType = "0x88a8";

      annotation =
        `Egress PE (${dev}) pops the PW label and pushes S-VLAN ${serviceVlan} for delivery to the egress NID/ENNI.`;
    } else if (role === "NID" && i === path.length - 1 && isEnni) {
      // Egress ENNI: translate back to partner S-VLAN
      actions.push({ type: "qinq-pop", svlan: serviceVlan });
      actions.push({ type: "cos-map", from: "Local S-VLAN " + serviceVlan, to: "Partner S-VLAN 800" });
      actions.push({ type: "qinq-push", svlan: 800 });
      headers.ethernet!.sVlan = 800;

      annotation =
        `Egress ENNI (${dev}) translates the S-VLAN back to the partner carrier's tag (S-VLAN 800) for handoff across the inter-carrier boundary. The frame exits with the partner's S-VLAN intact, completing the ENNI-to-ENNI E-Line service.`;
    } else if (role === "NID" && !isEnni) {
      // Egress UNI NID (for ENNI-UNI scenario)
      actions.push({ type: "qinq-pop", svlan: serviceVlan });
      headers.ethernet!.sVlan = undefined;
      headers.ethernet!.etherType = "0x0800";
      actions.push({ type: "forward", outInterface: "eth1" });

      annotation =
        `Egress NID (${dev}) is the retail UNI demarcation. It pops the S-VLAN ${serviceVlan} and delivers the original frame to the customer — the wholesale ENNI ingress and retail UNI egress complete the asymmetric E-Line.`;
    } else if (role === "CE") {
      actions.push({ type: "ip-lookup", result: "Destination reached" });
      annotation = "Destination CE receives the frame delivered through the MEF E-Line service.";
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

/**
 * VXLAN Ingress Replication: pe1 VTEP → pe2 VTEP
 */
function computeVXLAN(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];

  const srcVtep = getVtepIp(topo, scenario.sourceDevice);
  const dstVtep = getVtepIp(topo, scenario.destDevice);
  const vxlanCfg = getVxlanConfig(configs, scenario.sourceDevice);
  const vni = vxlanCfg?.l2_vnis?.[0]?.vni ?? 10100;
  const transportLabel = getNodeSidLabel(configs, scenario.destDevice);

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: "00:aa:bb:cc:00:01",
      dstMac: "00:aa:bb:cc:00:02",
      etherType: "0x0800",
    },
    ip: {
      src: "192.168.100.10",
      dst: "192.168.100.20",
      ttl: 64,
      dscp: "be",
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "CE";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (i === 0 && (role === "PE")) {
      // Source VTEP: VXLAN encapsulation
      actions.push({ type: "vxlan-encap", vni, outerDst: dstVtep });

      headers.vxlan = {
        outerSrcIp: srcVtep,
        outerDstIp: dstVtep,
        outerSrcPort: 49152,
        outerDstPort: 4789,
        vni,
      };

      // Also push MPLS transport label for underlay
      const transportMpls: MplsLabel = {
        value: transportLabel,
        ttl: 63,
        tc: 0,
        bottom: true,
        purpose: `Transport to ${scenario.destDevice} VTEP`,
      };
      actions.push({ type: "mpls-push", label: transportMpls });
      headers.mpls = [transportMpls];
      headers.ethernet!.etherType = "0x8847";

      annotation =
        `Source VTEP (${dev}) encapsulates the original L2 frame inside a VXLAN header with VNI ${vni}. An outer IP header is added with source VTEP ${srcVtep} and destination VTEP ${dstVtep}. The VXLAN packet is then forwarded via the MPLS underlay with transport label ${transportLabel}.`;
    } else if (role === "P") {
      // P router: MPLS swap in underlay
      const isPenultimate = i === path.length - 2;
      if (isPenultimate && headers.mpls?.length) {
        actions.push({ type: "php-pop", label: headers.mpls[0].value });
        headers.mpls = undefined;
        headers.ethernet!.etherType = "0x0800";
        annotation =
          "Penultimate hop pops the MPLS transport label (PHP). The outer IP header with VXLAN payload is now exposed for the destination VTEP.";
      } else if (headers.mpls?.length) {
        const oldLabel = headers.mpls[0].value;
        actions.push({ type: "mpls-swap", from: oldLabel, to: transportLabel });
        headers.mpls[0].ttl -= 1;
        actions.push({
          type: "ttl-decrement",
          from: headers.mpls[0].ttl + 1,
          to: headers.mpls[0].ttl,
        });
        annotation =
          "P router performs MPLS label swap for the underlay transport. It has no visibility into the VXLAN-encapsulated payload.";
      }
    } else if (i === path.length - 1 && (role === "PE")) {
      // Destination VTEP: VXLAN decapsulation
      actions.push({ type: "vxlan-decap" });
      headers.vxlan = undefined;
      headers.mpls = undefined;
      headers.ethernet!.etherType = "0x0800";

      annotation =
        `Destination VTEP (${dev}) receives the VXLAN packet, strips the outer IP/UDP/VXLAN headers, and delivers the original L2 frame to the local bridge domain (VNI ${vni}). The inner Ethernet frame is intact — the customer sees a seamless L2 extension.`;
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

/**
 * SR-TE Low-Latency Path
 */
function computeSRTE(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  _topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];
  const dscp = scenario.initialDscp ?? "ef";

  // Get the SR policy info
  const policy = configs.pe1?.sr_policy_config?.policies?.find((p: { name: string }) =>
    p.name.includes("low-latency")
  );
  const bindingSid = policy?.binding_sid?.label ?? 24001;
  const segments =
    policy?.candidate_paths?.[0]?.segment_lists?.[0]?.segments ?? [];

  // Build initial MPLS stack from segment list
  const initialStack: MplsLabel[] = segments.map((seg: { type: string; sid: number }, idx: number) => ({
    value: 16000 + seg.sid,
    ttl: 64,
    tc: 5,
    bottom: idx === segments.length - 1,
    purpose: `Node SID ${16000 + seg.sid} → ${getSidDeviceName(seg.sid, configs)}`,
  }));

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: "00:pe:01:00:00:01",
      dstMac: "00:p1:00:00:00:01",
      etherType: "0x8847",
    },
    mpls: [...initialStack],
    ip: {
      src: "10.0.0.1",
      dst: "10.0.0.2",
      ttl: 64,
      dscp,
      protocol: "TCP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (i === 0) {
      // Head-end: push SR-TE segment stack
      annotation =
        `Head-end router (${dev}) steers traffic into SR-TE policy "${policy?.name ?? "to-pe2-low-latency"}" (Binding SID ${bindingSid}). Instead of following the IGP shortest path, the segment list [${initialStack.map((l) => l.value).join(", ")}] explicitly routes the packet through specific nodes.`;

      for (const label of initialStack) {
        actions.push({ type: "mpls-push", label });
      }
    } else if (i < path.length - 1) {
      // Transit: pop top SID (this node's), expose next
      if (headers.mpls?.length) {
        const topLabel = headers.mpls[0].value;
        actions.push({ type: "mpls-pop", label: topLabel });
        headers.mpls = headers.mpls.slice(1);
        if (headers.mpls.length > 0) {
          headers.mpls[0] = { ...headers.mpls[0], bottom: headers.mpls.length === 1 };
        }
        const oldTtl = headers.mpls?.[0]?.ttl ?? 64;
        if (headers.mpls?.[0]) {
          headers.mpls[0].ttl = oldTtl - 1;
          actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
        }
        annotation =
          `Transit node ${dev}: pops its own Node SID (${topLabel}) from the top of the stack. The next segment is now exposed, directing the packet toward the next waypoint. The remaining stack depth is ${headers.mpls?.length ?? 0}.`;
      }
    } else {
      // Tail-end: pop last SID, deliver
      if (headers.mpls?.length) {
        actions.push({ type: "mpls-pop", label: headers.mpls[0].value });
        headers.mpls = undefined;
        headers.ethernet!.etherType = "0x0800";
      }
      annotation =
        `Tail-end router (${dev}) pops the final segment. The SR-TE path is complete. The packet is delivered as a plain IP packet. Total SR-TE path: ${path.join(" → ")}.`;
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

function getSidDeviceName(
  sidIndex: number,
  configs: Record<string, Device>
): string {
  for (const [dev, config] of Object.entries(configs)) {
    if (config.sr_config?.node_sids?.[0]?.index === sidIndex) return dev;
  }
  return `SID-${sidIndex}`;
}

/**
 * BGP Route Reflection: UPDATE message flow pe1 → rr1 → pe2
 */
function computeBGPRR(
  _scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  _configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "CE";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    let annotation = "";

    // BGP UPDATE is a TCP-based control plane message
    const srcLoopback = getLoopback(topo, path[0]);
    const dstLoopback = getLoopback(
      topo,
      i < path.length - 1 ? path[i + 1] : path[i]
    );

    const headers: PacketHeaders = {
      ethernet: {
        srcMac: `00:${dev}:00:00:00:01`,
        dstMac: `00:${path[i + 1] ?? dev}:00:00:00:01`,
        etherType: "0x0800",
      },
      ip: {
        src: srcLoopback,
        dst: dstLoopback,
        ttl: 64 - i,
        dscp: "cs6",
        protocol: "TCP/179 (BGP)",
      },
    };

    if (i === 0) {
      actions.push({
        type: "ip-lookup",
        result: `BGP UPDATE: advertising prefix 10.2.0.0/24 to RR ${path[1]}`,
      });
      annotation =
        `PE1 originates a BGP UPDATE message for prefix 10.2.0.0/24 (learned from CE customer VRF). The UPDATE is sent via iBGP to route reflector ${path[1]}. NEXT_HOP is set to ${srcLoopback} (PE1's loopback). AS-PATH is empty (iBGP).`;
    } else if (role === "RR") {
      actions.push({
        type: "ip-lookup",
        result: `RR reflects UPDATE to client ${path[i + 1] ?? "pe2"}`,
      });
      annotation =
        `Route Reflector ${dev} receives the UPDATE from PE1. Since PE1 is an RR client, ${dev} reflects the route to all other clients (including PE2). The NEXT_HOP is preserved as ${srcLoopback} (PE1) — the RR does NOT change it. The RR adds its CLUSTER_ID (${getLoopback(topo, dev)}) to prevent loops.`;
    } else if (i === path.length - 1) {
      actions.push({
        type: "ip-lookup",
        result: "BGP UPDATE received — install route in VRF",
      });
      annotation =
        `PE2 receives the reflected BGP UPDATE. It installs prefix 10.2.0.0/24 in its VRF with NEXT_HOP=${srcLoopback} (PE1's loopback). To reach this prefix, PE2 will push an MPLS label stack toward PE1. The route reflection solved the iBGP full-mesh problem: PE2 learned this route without a direct iBGP session to PE1.`;
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
      qosClass: "network-control",
    });
  }

  return states;
}

/**
 * Internet Transit: ce2 → agg1 → pe1 → p1 → p3 → asbr1 → isp-upstream
 */
function computeInternet(
  scenario: ScenarioDefinition,
  pathResult: PathResult,
  topo: Topology,
  configs: Record<string, Device>
): PacketState[] {
  const { path, interfaces } = pathResult;
  const states: PacketState[] = [];
  const dscp = scenario.initialDscp ?? "be";

  // Transport label to ASBR
  const asbrIdx = path.findIndex((d) => topo.device_roles?.[d] === "ASBR");
  const asbr = path[asbrIdx] ?? "asbr1";
  const transportLabel = getNodeSidLabel(configs, asbr);

  const internetSrcLoopback = getLoopback(topo, path[0]);

  let currentHeaders: PacketHeaders = {
    ethernet: {
      srcMac: `00:${path[0].slice(0, 2)}:00:00:00:01`,
      dstMac: `00:${path[1]?.slice(0, 2) ?? "xx"}:00:00:00:01`,
      etherType: "0x0800",
    },
    ip: {
      src: internetSrcLoopback,
      dst: "8.8.8.8",
      ttl: 64,
      dscp,
      protocol: "UDP",
    },
  };

  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    const role = topo.device_roles?.[dev] ?? "CE";
    const iface = interfaces[i];
    const actions: PacketAction[] = [];
    const headers = deepCloneHeaders(currentHeaders);
    let annotation = "";

    if (role === "CE" && i === 0) {
      actions.push({
        type: "ip-lookup",
        result: "Default route → PE1",
      });
      annotation =
        "Customer device sends internet-bound traffic via its default route toward the SP network.";
    } else if (role === "PE" && i > 0) {
      // Ingress PE: lookup in global table, push transport label to ASBR
      actions.push({
        type: "ip-lookup",
        result: `Global table: 0.0.0.0/0 → next-hop ${getLoopback(topo, asbr)} (eBGP learned)`,
      });

      const transportMpls: MplsLabel = {
        value: transportLabel,
        ttl: 63,
        tc: 0,
        bottom: true,
        purpose: `Transport to ${asbr}`,
      };
      actions.push({ type: "mpls-push", label: transportMpls });
      headers.mpls = [transportMpls];
      headers.ethernet!.etherType = "0x8847";

      annotation =
        `Ingress PE looks up the destination in the global routing table. The default route (learned via eBGP from the upstream ISP, reflected by ASBR) points to ${asbr}. A transport label ${transportLabel} is pushed to reach the ASBR via SR-MPLS.`;
    } else if (role === "P") {
      // P router: label swap
      const isPenultimate =
        i < path.length - 1 &&
        topo.device_roles?.[path[i + 1]] === "ASBR";
      if (isPenultimate && headers.mpls?.length) {
        actions.push({ type: "php-pop", label: headers.mpls[0].value });
        headers.mpls = undefined;
        headers.ethernet!.etherType = "0x0800";
        annotation =
          "Penultimate hop pops the transport label (PHP). The IP packet is exposed for the ASBR.";
      } else if (headers.mpls?.length) {
        actions.push({
          type: "mpls-swap",
          from: headers.mpls[0].value,
          to: transportLabel,
        });
        headers.mpls[0].ttl -= 1;
        actions.push({
          type: "ttl-decrement",
          from: headers.mpls[0].ttl + 1,
          to: headers.mpls[0].ttl,
        });
        annotation =
          "P router performs MPLS label swap, forwarding the packet toward the ASBR.";
      }
    } else if (role === "ASBR") {
      // ASBR: MPLS domain ends, eBGP next-hop, forward to ISP
      if (headers.mpls?.length) {
        actions.push({ type: "mpls-pop", label: headers.mpls[0].value });
        headers.mpls = undefined;
        headers.ethernet!.etherType = "0x0800";
      }
      actions.push({
        type: "ip-lookup",
        result: `eBGP next-hop: 203.0.113.1 (ISP upstream)`,
      });
      if (headers.ip) {
        const oldTtl = headers.ip.ttl;
        headers.ip.ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }

      annotation =
        `ASBR ${dev} is at the AS boundary (AS ${topo.sp_asn} → AS ${topo.upstream_asn}). The MPLS domain terminates here. The ASBR performs an IP lookup and forwards to the eBGP peer (ISP upstream). The next-hop changes from the SP internal address to the peering interface IP.`;
    } else if (role === "EXTERNAL") {
      actions.push({
        type: "ip-lookup",
        result: "ISP upstream routes packet toward internet destination",
      });
      if (headers.ip) {
        const oldTtl = headers.ip.ttl;
        headers.ip.ttl = oldTtl - 1;
        actions.push({ type: "ttl-decrement", from: oldTtl, to: oldTtl - 1 });
      }
      annotation =
        "The packet has left the SP network and entered the upstream ISP (AS " +
        topo.upstream_asn +
        "). The ISP routes it toward the internet destination using its own BGP table.";
    }

    states.push({
      hop: i,
      device: dev,
      ingressInterface: iface.ingress,
      egressInterface: iface.egress,
      headers,
      actions,
      annotation,
    });

    currentHeaders = deepCloneHeaders(headers);
  }

  return states;
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}
