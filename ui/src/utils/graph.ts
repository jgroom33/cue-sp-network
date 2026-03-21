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

// Initial Y positions by role to seed the layout
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

// X spread per role
const roleXOffsets: Record<DeviceRole, number> = {
  EXTERNAL: 0.5,
  ASBR: 0.35,
  RR: 0.65,
  PCE: 0.35,
  P: 0.5,
  PE: 0.5,
  AGG: 0.5,
  CE: 0.5,
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
    const siblings = byRole[role] || [dev];
    const idx = siblings.indexOf(dev);
    const count = siblings.length;

    // Spread siblings across X around the role's center offset
    const centerX = roleXOffsets[role] * width;
    const spread = Math.min(width * 0.6, count * 120);
    const x = centerX + (idx - (count - 1) / 2) * (spread / Math.max(count - 1, 1));

    return {
      id: dev,
      hostname: config?.hostname || dev,
      role,
      routerId: config?.router_id || "",
      loopback: topo.loopbacks[dev] || "",
      radius: nodeRadius[role],
      x: Math.max(40, Math.min(width - 40, x)),
      y: roleYPositions[role] * height + (Math.random() - 0.5) * 30,
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
