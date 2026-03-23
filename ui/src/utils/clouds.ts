import type { Topology, Device } from "../types";
import { toConfigKey } from "./graph";

export interface CloudGroup {
  id: string;
  label: string;
  color: string;
  fillOpacity: number;
  members: string[];
}

/**
 * Detect domain membership from device configs and build cloud groups.
 */
export function buildCloudGroups(
  topo: Topology,
  configs: Record<string, Device>
): CloudGroup[] {
  const groups: CloudGroup[] = [];

  const devicesWith = (test: (cfg: Device) => boolean): string[] =>
    topo.devices.filter((dev) => {
      const cfg = configs[toConfigKey(dev)];
      return cfg && test(cfg);
    });

  // IS-IS Domain
  const isisMembers = devicesWith((c) => !!c.isis_config);
  if (isisMembers.length > 0) {
    groups.push({
      id: "isis-domain",
      label: "IS-IS Domain",
      color: "#64748b", // slate-500
      fillOpacity: 0.06,
      members: isisMembers,
    });
  }

  // BGP Mesh
  const bgpMembers = devicesWith((c) => !!c.bgp_config);
  if (bgpMembers.length > 0) {
    groups.push({
      id: "bgp-mesh",
      label: "BGP Mesh",
      color: "#f59e0b", // amber-500
      fillOpacity: 0.06,
      members: bgpMembers,
    });
  }

  // VXLAN VTEPs
  const vxlanMembers = devicesWith((c) => !!c.vxlan_config?.enabled);
  if (vxlanMembers.length > 0) {
    groups.push({
      id: "vxlan-vteps",
      label: "VXLAN VTEPs",
      color: "#8b5cf6", // violet-500
      fillOpacity: 0.08,
      members: vxlanMembers,
    });
  }

  // G.8032 ERPS Ring
  const erpsMembers = devicesWith((c) => !!c.erps_config?.enabled);
  if (erpsMembers.length > 0) {
    const ringName =
      configs[toConfigKey(erpsMembers[0])]?.erps_config?.rings?.[0]
        ?.ring_name ?? "ERPS Ring";
    groups.push({
      id: "erps-ring",
      label: ringName,
      color: "#14b8a6", // teal-500
      fillOpacity: 0.08,
      members: erpsMembers,
    });
  }

  // L2VPN Service (PEs with pseudowires + NIDs with MEF UNI)
  const l2vpnMembers = devicesWith(
    (c) => !!c.l2vpn_config?.enabled || !!c.mef_config?.enabled
  );
  if (l2vpnMembers.length > 0) {
    groups.push({
      id: "l2vpn-service",
      label: "L2VPN Service",
      color: "#06b6d4", // cyan-500
      fillOpacity: 0.08,
      members: l2vpnMembers,
    });
  }

  return groups;
}

/**
 * Convex hull via Graham scan. Returns points in CCW order.
 */
export function computeConvexHull(
  points: { x: number; y: number }[]
): { x: number; y: number }[] {
  if (points.length <= 1) return [...points];
  if (points.length === 2) return [...points];

  // Find lowest-leftmost point
  const sorted = [...points].sort(
    (a, b) => a.y - b.y || a.x - b.x
  );
  const pivot = sorted[0];

  // Sort by polar angle from pivot
  const rest = sorted.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (angleA !== angleB) return angleA - angleB;
    // Same angle — closer point first
    const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
    const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
    return distA - distB;
  });

  const hull: { x: number; y: number }[] = [pivot];
  for (const p of rest) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (cross <= 0) hull.pop();
      else break;
    }
    hull.push(p);
  }

  return hull;
}

/**
 * Expand hull outward from centroid by padding amount.
 */
function expandHull(
  hull: { x: number; y: number }[],
  padding: number
): { x: number; y: number }[] {
  if (hull.length === 0) return hull;

  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;

  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      x: p.x + (dx / dist) * padding,
      y: p.y + (dy / dist) * padding,
    };
  });
}

/**
 * Generate an SVG path for a cloud shape from device positions.
 * Uses convex hull with padding and rounded corners.
 * Falls back to ellipse for 1-2 nodes.
 */
export function cloudPath(
  positions: { x: number; y: number }[],
  padding = 40
): string {
  if (positions.length === 0) return "";

  if (positions.length === 1) {
    // Single node — draw circle
    const p = positions[0];
    const r = padding;
    return `M ${p.x - r},${p.y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;
  }

  if (positions.length === 2) {
    // Two nodes — draw rounded rectangle / stadium shape
    const [a, b] = positions;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const r = padding;

    // Four corners of the stadium
    const p1 = { x: a.x + nx * r, y: a.y + ny * r };
    const p2 = { x: b.x + nx * r, y: b.y + ny * r };
    const p3 = { x: b.x - nx * r, y: b.y - ny * r };
    const p4 = { x: a.x - nx * r, y: a.y - ny * r };

    return (
      `M ${p1.x},${p1.y} L ${p2.x},${p2.y} ` +
      `A ${r},${r} 0 0,1 ${p3.x},${p3.y} ` +
      `L ${p4.x},${p4.y} ` +
      `A ${r},${r} 0 0,1 ${p1.x},${p1.y} Z`
    );
  }

  // 3+ nodes — convex hull with rounded corners
  const hull = computeConvexHull(positions);
  const expanded = expandHull(hull, padding);

  if (expanded.length < 3) return "";

  // Build path with rounded corners using cubic Bézier
  const cornerRadius = Math.min(padding * 0.6, 25);
  const parts: string[] = [];
  const n = expanded.length;

  for (let i = 0; i < n; i++) {
    const prev = expanded[(i - 1 + n) % n];
    const curr = expanded[i];
    const next = expanded[(i + 1) % n];

    // Vector from curr to prev and curr to next
    const toPrev = { x: prev.x - curr.x, y: prev.y - curr.y };
    const toNext = { x: next.x - curr.x, y: next.y - curr.y };

    const lenPrev = Math.sqrt(toPrev.x ** 2 + toPrev.y ** 2) || 1;
    const lenNext = Math.sqrt(toNext.x ** 2 + toNext.y ** 2) || 1;

    const r = Math.min(cornerRadius, lenPrev / 3, lenNext / 3);

    // Points where the corner arc starts/ends
    const startX = curr.x + (toPrev.x / lenPrev) * r;
    const startY = curr.y + (toPrev.y / lenPrev) * r;
    const endX = curr.x + (toNext.x / lenNext) * r;
    const endY = curr.y + (toNext.y / lenNext) * r;

    if (i === 0) {
      parts.push(`M ${startX},${startY}`);
    } else {
      parts.push(`L ${startX},${startY}`);
    }

    // Cubic Bézier through the corner
    parts.push(`Q ${curr.x},${curr.y} ${endX},${endY}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

/**
 * Get the label position (top-left-ish) for a cloud.
 */
export function cloudLabelPosition(
  positions: { x: number; y: number }[],
  padding = 40
): { x: number; y: number } {
  if (positions.length === 0) return { x: 0, y: 0 };

  // Find the topmost point, then offset up-left
  let minY = Infinity;
  let minYx = 0;
  for (const p of positions) {
    if (p.y < minY) {
      minY = p.y;
      minYx = p.x;
    }
  }

  return { x: minYx - padding * 0.5, y: minY - padding - 4 };
}
