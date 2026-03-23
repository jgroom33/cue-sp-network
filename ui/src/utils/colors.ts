import type { DeviceRole, LinkType, OverlayType } from "../types";

export const roleColors: Record<DeviceRole, string> = {
  PE: "#3b82f6",       // blue
  P: "#6b7280",        // gray
  RR: "#a855f7",       // purple
  ASBR: "#ef4444",     // red
  AGG: "#f97316",      // orange
  CE: "#22c55e",       // green
  NID: "#facc15",      // yellow-400
  PCE: "#14b8a6",      // teal
  EXTERNAL: "#ec4899", // pink
};

export const roleBgColors: Record<DeviceRole, string> = {
  PE: "bg-blue-500",
  P: "bg-gray-500",
  RR: "bg-purple-500",
  ASBR: "bg-red-500",
  AGG: "bg-orange-500",
  CE: "bg-green-500",
  NID: "bg-yellow-400",
  PCE: "bg-teal-500",
  EXTERNAL: "bg-pink-500",
};

export const roleBorderColors: Record<DeviceRole, string> = {
  PE: "border-blue-500",
  P: "border-gray-500",
  RR: "border-purple-500",
  ASBR: "border-red-500",
  AGG: "border-orange-500",
  CE: "border-green-500",
  NID: "border-yellow-400",
  PCE: "border-teal-500",
  EXTERNAL: "border-pink-500",
};

export const linkColors: Record<LinkType, string> = {
  core: "#4b5563",     // dark gray
  edge: "#60a5fa",     // light blue
  customer: "#22c55e", // green
  peering: "#ef4444",  // red
};

export const overlayColors: Record<OverlayType, string> = {
  ibgp: "#fbbf24",       // amber
  ebgp: "#f97316",       // orange
  "sr-sids": "#a78bfa",  // violet
  "link-ips": "#94a3b8", // slate
  loopbacks: "#67e8f9",  // cyan
  "cloud-isis": "#64748b",  // slate-500
  "cloud-bgp": "#f59e0b",   // amber-500
  "cloud-vxlan": "#8b5cf6", // violet-500
  "cloud-erps": "#14b8a6",  // teal-500
  "cloud-l2vpn": "#06b6d4", // cyan-500
};

export const overlayLabels: Record<OverlayType, string> = {
  ibgp: "iBGP",
  ebgp: "eBGP",
  "sr-sids": "SR SIDs",
  "link-ips": "Link IPs",
  loopbacks: "Loopbacks",
  "cloud-isis": "IS-IS Domain",
  "cloud-bgp": "BGP Mesh",
  "cloud-vxlan": "VXLAN VTEPs",
  "cloud-erps": "G.8032 Ring",
  "cloud-l2vpn": "L2VPN",
};

export const nodeRadius: Record<DeviceRole, number> = {
  PE: 22,
  P: 18,
  RR: 20,
  ASBR: 22,
  AGG: 16,
  CE: 14,
  NID: 14,
  PCE: 18,
  EXTERNAL: 16,
};
