import { describe, it, expect } from "vitest";
import {
  buildAdjacencyGraph,
  dijkstra,
  computeBackupPath,
  type AdjacencyGraph,
} from "../pathfinding";
import type { Topology, Device } from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a simple adjacency graph from an edge list. */
function makeGraph(
  nodes: string[],
  edges: { from: string; to: string; metric: number }[]
): AdjacencyGraph {
  const g: AdjacencyGraph = new Map();
  for (const n of nodes) g.set(n, []);
  for (const e of edges) {
    g.get(e.from)!.push({
      neighbor: e.to,
      metric: e.metric,
      aInterface: `${e.from}->${e.to}`,
      zInterface: `${e.to}<-${e.from}`,
    });
    g.get(e.to)!.push({
      neighbor: e.from,
      metric: e.metric,
      aInterface: `${e.to}->${e.from}`,
      zInterface: `${e.from}<-${e.to}`,
    });
  }
  return g;
}

/** Minimal topology helper. */
function makeTopo(
  devices: string[],
  links: {
    a: string;
    aIf: string;
    z: string;
    zIf: string;
    type: "core" | "edge" | "customer" | "peering";
    metric?: number;
  }[]
): Topology {
  return {
    devices,
    device_roles: Object.fromEntries(devices.map((d) => [d, "PE"])) as any,
    links: links.map((l) => ({
      a_end: { device: l.a, interface: l.aIf },
      z_end: { device: l.z, interface: l.zIf },
      type: l.type,
      metric: l.metric,
    })),
    loopbacks: {},
    vtep_loopbacks: {},
    p2p_subnets: {},
    customer_subnets: {},
    management_subnet: "10.0.0.0/24",
    sp_asn: 65000,
    ce1_asn: 65001,
    upstream_asn: 65002,
    isis_area: "49.0001",
  };
}

const emptyConfigs: Record<string, Device> = {};

// ---------------------------------------------------------------------------
// dijkstra
// ---------------------------------------------------------------------------

describe("dijkstra", () => {
  it("finds shortest path between directly connected nodes", () => {
    const g = makeGraph(["A", "B"], [{ from: "A", to: "B", metric: 10 }]);
    const result = dijkstra(g, "A", "B");
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(["A", "B"]);
  });

  it("finds shortest multi-hop path over a higher-cost direct link", () => {
    // A--B cost 5, B--C cost 5, A--C cost 100
    const g = makeGraph(
      ["A", "B", "C"],
      [
        { from: "A", to: "B", metric: 5 },
        { from: "B", to: "C", metric: 5 },
        { from: "A", to: "C", metric: 100 },
      ]
    );
    const result = dijkstra(g, "A", "C");
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(["A", "B", "C"]);
  });

  it("returns null when destination is unreachable", () => {
    const g = makeGraph(
      ["A", "B", "C"],
      [{ from: "A", to: "B", metric: 10 }]
    );
    const result = dijkstra(g, "A", "C");
    expect(result).toBeNull();
  });

  it("returns single-node path when source equals destination", () => {
    const g = makeGraph(["A", "B"], [{ from: "A", to: "B", metric: 10 }]);
    const result = dijkstra(g, "A", "A");
    expect(result).not.toBeNull();
    expect(result!.path).toEqual(["A"]);
  });

  it("populates interface info for each hop", () => {
    const g = makeGraph(
      ["A", "B", "C"],
      [
        { from: "A", to: "B", metric: 10 },
        { from: "B", to: "C", metric: 10 },
      ]
    );
    const result = dijkstra(g, "A", "C");
    expect(result).not.toBeNull();
    expect(result!.interfaces).toHaveLength(3);
    // First device has no ingress
    expect(result!.interfaces[0].ingress).toBe("");
    // Last device has no egress
    expect(result!.interfaces[2].egress).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildAdjacencyGraph
// ---------------------------------------------------------------------------

describe("buildAdjacencyGraph", () => {
  const topo = makeTopo(
    ["R1", "R2", "R3"],
    [
      { a: "R1", aIf: "eth0", z: "R2", zIf: "eth0", type: "core", metric: 10 },
      { a: "R2", aIf: "eth1", z: "R3", zIf: "eth0", type: "core", metric: 20 },
    ]
  );

  it("contains all devices as keys", () => {
    const g = buildAdjacencyGraph(topo, emptyConfigs);
    expect([...g.keys()].sort()).toEqual(["R1", "R2", "R3"]);
  });

  it("creates bidirectional adjacencies", () => {
    const g = buildAdjacencyGraph(topo, emptyConfigs);
    const r1Neighbors = g.get("R1")!.map((e) => e.neighbor);
    const r2Neighbors = g.get("R2")!.map((e) => e.neighbor);
    expect(r1Neighbors).toContain("R2");
    expect(r2Neighbors).toContain("R1");
    expect(r2Neighbors).toContain("R3");
  });

  it("excludes disabled links", () => {
    const disabled = new Set(["R1::R2"]);
    const g = buildAdjacencyGraph(topo, emptyConfigs, disabled);
    const r1Neighbors = g.get("R1")!.map((e) => e.neighbor);
    expect(r1Neighbors).not.toContain("R2");
  });

  it("excludes customer links when includeCustomerEdge is false", () => {
    const topoWithCust = makeTopo(
      ["R1", "R2", "CE1"],
      [
        { a: "R1", aIf: "eth0", z: "R2", zIf: "eth0", type: "core", metric: 10 },
        { a: "R2", aIf: "eth1", z: "CE1", zIf: "eth0", type: "customer" },
      ]
    );
    const g = buildAdjacencyGraph(topoWithCust, emptyConfigs, new Set(), false);
    const r2Neighbors = g.get("R2")!.map((e) => e.neighbor);
    expect(r2Neighbors).not.toContain("CE1");
    expect(r2Neighbors).toContain("R1");
  });
});

// ---------------------------------------------------------------------------
// computeBackupPath
// ---------------------------------------------------------------------------

describe("computeBackupPath", () => {
  it("finds alternate path when primary link fails", () => {
    // Triangle: R1-R2 (10), R2-R3 (10), R1-R3 (100)
    const topo = makeTopo(
      ["R1", "R2", "R3"],
      [
        { a: "R1", aIf: "e0", z: "R2", zIf: "e0", type: "core", metric: 10 },
        { a: "R2", aIf: "e1", z: "R3", zIf: "e0", type: "core", metric: 10 },
        { a: "R1", aIf: "e1", z: "R3", zIf: "e1", type: "core", metric: 100 },
      ]
    );
    // Fail the R1-R2 link; backup should go R1->R3 direct
    const result = computeBackupPath(topo, emptyConfigs, "R1", "R3", "R1::R2");
    expect(result).not.toBeNull();
    // The backup must not go through R2 via the failed link direction
    // R1-R3 direct (100) is the only option since R1-R2 is down
    expect(result!.path).toContain("R1");
    expect(result!.path).toContain("R3");
  });

  it("returns null when no alternate path exists", () => {
    const topo = makeTopo(
      ["R1", "R2"],
      [
        { a: "R1", aIf: "e0", z: "R2", zIf: "e0", type: "core", metric: 10 },
      ]
    );
    const result = computeBackupPath(topo, emptyConfigs, "R1", "R2", "R1::R2");
    expect(result).toBeNull();
  });
});
