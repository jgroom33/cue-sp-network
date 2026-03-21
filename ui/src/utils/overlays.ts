import type { Topology, Device, OverlayLink, OverlayData, SRLabel } from "../types";
import { toConfigKey } from "./graph";

/**
 * Build all overlay data from the network topology and device configs.
 */
export function buildOverlayData(
  topo: Topology,
  configs: Record<string, Device>
): OverlayData {
  const bgpLinks = buildBGPLinks(topo, configs);
  const srLabels = buildSRLabels(topo, configs);
  const linkAddresses = buildLinkAddresses(topo, configs);
  return { bgpLinks, srLabels, linkAddresses };
}

/**
 * Resolve BGP neighbor addresses to device names and build overlay links.
 */
function buildBGPLinks(
  topo: Topology,
  configs: Record<string, Device>
): OverlayLink[] {
  // Build IP → device lookup from loopbacks
  const ipToDevice: Record<string, string> = {};
  for (const [dev, ip] of Object.entries(topo.loopbacks)) {
    ipToDevice[ip] = dev;
  }

  // Also index all interface IPs for eBGP resolution
  for (const dev of topo.devices) {
    const cfg = configs[toConfigKey(dev)];
    if (!cfg) continue;
    for (const iface of cfg.interfaces) {
      if (iface.ipv4) {
        // Strip prefix length: "10.2.0.1/24" → "10.2.0.1"
        const ip = iface.ipv4.split("/")[0];
        // Don't overwrite loopback entries
        if (!ipToDevice[ip]) {
          ipToDevice[ip] = dev;
        }
      }
    }
  }

  const seen = new Set<string>();
  const links: OverlayLink[] = [];

  for (const dev of topo.devices) {
    const cfg = configs[toConfigKey(dev)];
    if (!cfg?.bgp_config) continue;

    for (const neighbor of cfg.bgp_config.neighbors) {
      // Resolve target device from neighbor address
      const targetDev = ipToDevice[neighbor.address];
      if (!targetDev || targetDev === dev) continue;

      // Deduplicate bidirectional sessions
      const key = [dev, targetDev].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);

      const type = neighbor.peer_type === "internal" ? "ibgp" : "ebgp";

      links.push({
        source: dev,
        target: targetDev,
        type,
        peerGroup: neighbor.peer_group,
        addressFamilies: neighbor.address_families,
        isRRClient: neighbor.route_reflector_client ?? false,
        sourceLoopback: topo.loopbacks[dev] || "",
        targetLoopback: topo.loopbacks[targetDev] || "",
      });
    }
  }

  return links;
}

/**
 * Build SR-MPLS label data for each device with node SIDs.
 */
function buildSRLabels(
  topo: Topology,
  configs: Record<string, Device>
): Record<string, SRLabel> {
  const labels: Record<string, SRLabel> = {};

  for (const dev of topo.devices) {
    const cfg = configs[toConfigKey(dev)];
    if (!cfg?.sr_config?.enabled || !cfg.sr_config.node_sids?.length) continue;

    const sid = cfg.sr_config.node_sids[0];
    labels[dev] = {
      nodeSid: cfg.sr_config.srgb.start + sid.index,
      srgbStart: cfg.sr_config.srgb.start,
      adjSids: (cfg.sr_config.adj_sids || []).map((a) => ({
        label: a.label,
        iface: a.interface,
        neighbor: a.neighbor,
      })),
    };
  }

  return labels;
}

/**
 * Build link address data: for each physical link, look up interface IPs.
 */
function buildLinkAddresses(
  topo: Topology,
  configs: Record<string, Device>
): Record<string, { aIp: string; zIp: string }> {
  const addresses: Record<string, { aIp: string; zIp: string }> = {};
  const deviceSet = new Set(topo.devices);

  for (const link of topo.links) {
    if (!deviceSet.has(link.a_end.device) || !deviceSet.has(link.z_end.device)) continue;

    const aCfg = configs[toConfigKey(link.a_end.device)];
    const zCfg = configs[toConfigKey(link.z_end.device)];
    const aIface = aCfg?.interfaces.find((i) => i.name === link.a_end.interface);
    const zIface = zCfg?.interfaces.find((i) => i.name === link.z_end.interface);

    const aIp = aIface?.ipv4?.split("/")[0] || "";
    const zIp = zIface?.ipv4?.split("/")[0] || "";

    if (aIp || zIp) {
      const key = `${link.a_end.device}::${link.z_end.device}`;
      addresses[key] = { aIp, zIp };
    }
  }

  return addresses;
}

/**
 * Compute a quadratic Bezier SVG path with a perpendicular curve offset.
 */
export function curvedPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  curveOffset: number
): string {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * curveOffset;
  const cy = my + ny * curveOffset;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}
