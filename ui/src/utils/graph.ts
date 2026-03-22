import type { Topology, Device, DeviceRole } from "../types";
import { nodeRadius } from "./colors";

export interface GraphNode {
  id: string;
  hostname: string;
  role: DeviceRole;
  routerId: string;
  loopback: string;
  radius: number;
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  z_end: string;
  target: string | GraphNode;
  type: string;
  aInterface: string;
  zInterface: string;
  aDevice: string;
  zDevice: string;
  metric?: number;
}

// Fixed positions for deterministic layout (fraction of width/height).
// Designed so P routers form a square in the center, with clear
// vertical tiers: EXTERNAL → ASBR → RR/PCE → P → PE → AGG → CE.
const fixedPositions: Record<string, { x: number; y: number }> = {
  // External / ISP — top center
  "isp-upstream": { x: 0.50, y: 0.04 },
  // ASBRs — below external, spread horizontally
  asbr1:          { x: 0.38, y: 0.15 },
  asbr2:          { x: 0.62, y: 0.15 },
  // Route Reflectors — flanking the core
  rr1:            { x: 0.18, y: 0.32 },
  rr2:            { x: 0.82, y: 0.32 },
  // PCE — near RRs
  pce1:           { x: 0.18, y: 0.22 },
  // P routers — square in center (pe1→p1 left, pe2→p4 right-diagonal)
  p3:             { x: 0.35, y: 0.28 },
  p4:             { x: 0.65, y: 0.28 },
  p1:             { x: 0.35, y: 0.48 },
  p2:             { x: 0.65, y: 0.48 },
  // PEs — below P core, left/right aligned
  pe1:            { x: 0.25, y: 0.64 },
  pe2:            { x: 0.75, y: 0.64 },
  // AGGs — below PEs, fanned out
  agg1:           { x: 0.12, y: 0.78 },
  agg3:           { x: 0.32, y: 0.78 },
  agg4:           { x: 0.68, y: 0.78 },
  agg2:           { x: 0.88, y: 0.78 },
  // CEs — bottom tier
  ce2:            { x: 0.18, y: 0.92 },
  ce1:            { x: 0.50, y: 0.92 },
  ce3:            { x: 0.82, y: 0.92 },
};

// Fallback positions by role (for any device not in the map above)
const roleYPositions: Record<DeviceRole, number> = {
  EXTERNAL: 0.05,
  ASBR: 0.15,
  RR: 0.3,
  PCE: 0.3,
  P: 0.45,
  PE: 0.7,
  AGG: 0.8,
  CE: 0.92,
};

// Normalize device name from topo (isp-upstream) to config key (isp_upstream)
export function toConfigKey(name: string): string {
  return name.replace(/-/g, "_");
}

export function buildGraph(
  topo: Topology,
  configs: Record<string, Device>,
  width: number,
  height: number
): { nodes: GraphNode[]; links: GraphLink[] } {
  // Group devices by role for X spacing
  const byRole: Record<string, string[]> = {};
  for (const dev of topo.devices) {
    const role = topo.device_roles[dev] || "EXTERNAL";
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(dev);
  }

  const nodes: GraphNode[] = topo.devices.map((dev) => {
    const role = (topo.device_roles[dev] || "EXTERNAL") as DeviceRole;
    const configKey = toConfigKey(dev);
    const config = configs[configKey];

    // Use fixed position if available, otherwise fall back to role-based placement
    const fixed = fixedPositions[dev];
    let x: number;
    let y: number;
    if (fixed) {
      x = fixed.x * width;
      y = fixed.y * height;
    } else {
      const siblings = byRole[role] || [dev];
      const idx = siblings.indexOf(dev);
      const count = siblings.length;
      x = 0.5 * width + (idx - (count - 1) / 2) * 120;
      y = roleYPositions[role] * height;
    }

    return {
      id: dev,
      hostname: config?.hostname || dev,
      role,
      routerId: config?.router_id || "",
      loopback: topo.loopbacks[dev] || "",
      radius: nodeRadius[role],
      x,
      y,
      fx: x,
      fy: y,
    };
  });

  const deviceSet = new Set(topo.devices);
  const links: GraphLink[] = topo.links
    .filter((link) => deviceSet.has(link.a_end.device) && deviceSet.has(link.z_end.device))
    .map((link) => ({
      source: link.a_end.device,
      z_end: link.z_end.device,
      target: link.z_end.device,
      type: link.type,
      aInterface: link.a_end.interface,
      zInterface: link.z_end.interface,
      aDevice: link.a_end.device,
      zDevice: link.z_end.device,
      metric: link.metric,
    }));

  return { nodes, links };
}

// Get protocols running on a device
export function getDeviceProtocols(device: Device): string[] {
  const protocols: string[] = [];
  if (device.isis_config) protocols.push("IS-IS");
  if (device.sr_config?.enabled) protocols.push("SR-MPLS");
  if (device.bgp_config) protocols.push("BGP");
  if (device.ospf_config?.enabled) protocols.push("OSPF");
  if (device.bfd_config?.enabled) protocols.push("BFD");
  if (device.qos_config?.enabled) protocols.push("QoS");
  if (device.tilfa_config?.enabled) protocols.push("TI-LFA");
  if (device.sr_policy_config?.enabled) protocols.push("SR Policy");
  if (device.vxlan_config?.enabled) protocols.push("VXLAN");
  if (device.l2vpn_config?.enabled) protocols.push("L2VPN");
  if (device.vrrp_config?.enabled) protocols.push("VRRP");
  if (device.acl_config) protocols.push("ACL");
  if (device.copp_config?.enabled) protocols.push("CoPP");
  if (device.rpki_config?.enabled) protocols.push("RPKI");
  if (device.macsec_config?.enabled) protocols.push("MACsec");
  if (device.flowspec_config?.enabled) protocols.push("Flowspec");
  if (device.dot1q_config?.enabled) protocols.push("802.1Q");
  if (device.dot1ad_config?.enabled) protocols.push("802.1ad");
  if (device.l2qos_config?.enabled) protocols.push("L2 QoS");
  if (device.route_policy_config) protocols.push("Route Policy");
  if (device.handoff_config) protocols.push("Handoff");
  if (device.lldp_config?.enabled) protocols.push("LLDP");
  return protocols;
}

// All possible protocols for filtering
export const ALL_PROTOCOLS = [
  "IS-IS", "SR-MPLS", "BGP", "OSPF", "BFD", "QoS", "TI-LFA",
  "SR Policy", "VXLAN", "L2VPN", "VRRP", "ACL", "CoPP", "RPKI",
  "MACsec", "Flowspec", "802.1Q", "802.1ad", "L2 QoS", "Route Policy",
  "Handoff", "LLDP",
];
