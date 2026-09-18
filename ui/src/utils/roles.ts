import type { DeviceRole } from "../types";

/**
 * Resolve a device's role. Prefers the topology's authoritative map; falls
 * back to a hostname-prefix heuristic for synthetic names.
 */
export function getDeviceRole(
  device: string,
  deviceRoles?: Record<string, DeviceRole>
): DeviceRole {
  const known = deviceRoles?.[device];
  if (known) return known;
  const d = device.toLowerCase();
  if (d.startsWith("ce")) return "CE";
  if (d.startsWith("pe")) return "PE";
  if (d.startsWith("pce")) return "PCE";
  if (d.startsWith("rr")) return "RR";
  if (d.startsWith("asbr")) return "ASBR";
  if (d.startsWith("agg")) return "AGG";
  if (d.startsWith("nid") || d.startsWith("enni")) return "NID";
  if (d.startsWith("isp")) return "EXTERNAL";
  if (d.startsWith("p")) return "P";
  return "P";
}

export const roleAbbrev: Record<DeviceRole, string> = {
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
