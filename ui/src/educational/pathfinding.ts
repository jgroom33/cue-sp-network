import type { Topology, Device } from "../types";

interface AdjEntry {
  neighbor: string;
  metric: number;
  aInterface: string;
  zInterface: string;
}

export type AdjacencyGraph = Map<string, AdjEntry[]>;

/**
 * Build adjacency graph from topology links, excluding disabled links.
 * Only includes IS-IS enabled devices (core + edge links, not customer/peering by default).
 */
export function buildAdjacencyGraph(
  topo: Topology,
  _configs: Record<string, Device>,
  disabledLinks: Set<string> = new Set(),
  includeCustomerEdge = true
): AdjacencyGraph {
  const graph: AdjacencyGraph = new Map();

  // Initialize all devices
  for (const dev of topo.devices) {
    graph.set(dev, []);
  }

  for (const link of topo.links) {
    const a = link.a_end.device;
    const z = link.z_end.device;

    // Check disabled links (bidirectional key)
    const key1 = `${a}::${z}`;
    const key2 = `${z}::${a}`;
    if (disabledLinks.has(key1) || disabledLinks.has(key2)) continue;

    // Include core + edge links for MPLS domain
    // Include customer links only if requested (for CE-to-CE scenarios)
    if (link.type === "customer" && !includeCustomerEdge) continue;

    const metric = link.metric ?? getDefaultMetric(link.type);

    graph.get(a)?.push({
      neighbor: z,
      metric,
      aInterface: link.a_end.interface,
      zInterface: link.z_end.interface,
    });
    graph.get(z)?.push({
      neighbor: a,
      metric,
      aInterface: link.z_end.interface,
      zInterface: link.a_end.interface,
    });
  }

  return graph;
}

function getDefaultMetric(linkType: string): number {
  switch (linkType) {
    case "core":
      return 10;
    case "edge":
      return 20;
    case "customer":
      return 100;
    case "peering":
      return 50;
    default:
      return 10;
  }
}

export interface PathResult {
  path: string[];
  interfaces: { device: string; ingress: string; egress: string }[];
}

/**
 * Dijkstra's shortest path between source and destination.
 */
export function dijkstra(
  graph: AdjacencyGraph,
  source: string,
  dest: string
): PathResult | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, { device: string; viaInterface: string; arriveInterface: string } | null>();
  const visited = new Set<string>();

  for (const node of graph.keys()) {
    dist.set(node, Infinity);
    prev.set(node, null);
  }
  dist.set(source, 0);

  while (true) {
    // Find unvisited node with minimum distance
    let minNode: string | null = null;
    let minDist = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < minDist) {
        minDist = d;
        minNode = node;
      }
    }
    if (minNode === null || minNode === dest) break;

    visited.add(minNode);

    const neighbors = graph.get(minNode) ?? [];
    for (const adj of neighbors) {
      if (visited.has(adj.neighbor)) continue;
      const newDist = minDist + adj.metric;
      if (newDist < (dist.get(adj.neighbor) ?? Infinity)) {
        dist.set(adj.neighbor, newDist);
        prev.set(adj.neighbor, {
          device: minNode,
          viaInterface: adj.aInterface,
          arriveInterface: adj.zInterface,
        });
      }
    }
  }

  // Reconstruct path
  if (dist.get(dest) === Infinity) return null;

  const path: string[] = [];
  const interfaceMap: { device: string; ingress: string; egress: string }[] = [];
  let current: string | undefined = dest;

  while (current) {
    path.unshift(current);
    const p = prev.get(current);
    if (!p) break;
    current = p.device;
  }

  // Build interface info for each hop
  for (let i = 0; i < path.length; i++) {
    const dev = path[i];
    let ingress = "";
    let egress = "";

    if (i > 0) {
      // Find how we arrived at this device
      const prevDev = path[i - 1];
      const link = findLink(graph, prevDev, dev);
      if (link) ingress = link.zInterface;
    }
    if (i < path.length - 1) {
      // Find how we leave this device
      const nextDev = path[i + 1];
      const link = findLink(graph, dev, nextDev);
      if (link) egress = link.aInterface;
    }

    interfaceMap.push({ device: dev, ingress, egress });
  }

  return { path, interfaces: interfaceMap };
}

function findLink(
  graph: AdjacencyGraph,
  from: string,
  to: string
): AdjEntry | undefined {
  return graph.get(from)?.find((adj) => adj.neighbor === to);
}

/**
 * Resolve SR-TE segment list to a device path.
 * Each node-SID maps to a device via the configs.
 */
export function resolveSegmentList(
  segments: { type: string; sid: number }[],
  configs: Record<string, Device>,
  graph: AdjacencyGraph,
  source: string
): PathResult | null {
  // Build SID → device mapping
  const sidToDevice = new Map<number, string>();
  for (const [dev, config] of Object.entries(configs)) {
    const sr = config.sr_config;
    if (!sr?.enabled) continue;
    for (const nodeSid of sr.node_sids ?? []) {
      sidToDevice.set(nodeSid.index, dev);
    }
  }

  // Build full path through segment waypoints
  const waypoints = [source];
  for (const seg of segments) {
    if (seg.type === "node-sid") {
      const dev = sidToDevice.get(seg.sid);
      if (dev) waypoints.push(dev);
    }
  }

  // Connect each waypoint pair via Dijkstra
  const fullPath: string[] = [];
  const fullInterfaces: { device: string; ingress: string; egress: string }[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const sub = dijkstra(graph, waypoints[i], waypoints[i + 1]);
    if (!sub) return null;

    // Avoid duplicating the junction node
    const startIdx = i === 0 ? 0 : 1;
    for (let j = startIdx; j < sub.path.length; j++) {
      fullPath.push(sub.path[j]);
      fullInterfaces.push(sub.interfaces[j]);
    }
  }

  return { path: fullPath, interfaces: fullInterfaces };
}

/**
 * Re-run Dijkstra with a link removed (TI-LFA simulation).
 */
export function computeBackupPath(
  topo: Topology,
  configs: Record<string, Device>,
  source: string,
  dest: string,
  failedLinkKey: string
): PathResult | null {
  const disabled = new Set([failedLinkKey]);
  const graph = buildAdjacencyGraph(topo, configs, disabled, true);
  return dijkstra(graph, source, dest);
}
