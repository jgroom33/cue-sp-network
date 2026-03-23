import { describe, it, expect } from "vitest";
import {
  computeConvexHull,
  cloudPath,
  cloudLabelPosition,
} from "../clouds";

// ---------------------------------------------------------------------------
// computeConvexHull
// ---------------------------------------------------------------------------

describe("computeConvexHull", () => {
  it("returns same point for a single point", () => {
    const pts = [{ x: 5, y: 5 }];
    const hull = computeConvexHull(pts);
    expect(hull).toEqual([{ x: 5, y: 5 }]);
  });

  it("returns both points for two points", () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
    const hull = computeConvexHull(pts);
    expect(hull).toHaveLength(2);
  });

  it("returns all three vertices for a triangle", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ];
    const hull = computeConvexHull(pts);
    expect(hull).toHaveLength(3);
  });

  it("returns all four vertices for a square", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const hull = computeConvexHull(pts);
    expect(hull).toHaveLength(4);
  });

  it("excludes an interior point from the hull", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
      { x: 10, y: 10 }, // interior
    ];
    const hull = computeConvexHull(pts);
    expect(hull).toHaveLength(4);
    const hasInterior = hull.some((p) => p.x === 10 && p.y === 10);
    expect(hasInterior).toBe(false);
  });

  it("handles collinear points", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ];
    const hull = computeConvexHull(pts);
    // Collinear points should produce a degenerate hull (2 endpoints)
    expect(hull.length).toBeLessThanOrEqual(3);
    expect(hull.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// cloudPath
// ---------------------------------------------------------------------------

describe("cloudPath", () => {
  it("returns empty string for empty positions", () => {
    expect(cloudPath([])).toBe("");
  });

  it("returns a circle path for a single position", () => {
    const path = cloudPath([{ x: 100, y: 100 }]);
    expect(path).not.toBe("");
    expect(path).toContain("a "); // arc command
  });

  it("returns non-empty path for two positions", () => {
    const path = cloudPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]);
    expect(path).not.toBe("");
    expect(path).toContain("M ");
  });

  it("returns non-empty path for 3+ positions", () => {
    const path = cloudPath([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ]);
    expect(path).not.toBe("");
    expect(path).toContain("Z");
  });
});

// ---------------------------------------------------------------------------
// cloudLabelPosition
// ---------------------------------------------------------------------------

describe("cloudLabelPosition", () => {
  it("returns position above the topmost point", () => {
    const positions = [
      { x: 50, y: 100 },
      { x: 100, y: 50 }, // topmost (smallest y)
      { x: 150, y: 200 },
    ];
    const label = cloudLabelPosition(positions, 40);
    // Should be above the point with y=50
    expect(label.y).toBeLessThan(50);
    // x should be near the topmost point's x
    expect(label.x).toBeCloseTo(100 - 40 * 0.5, 1);
  });

  it("returns origin for empty positions", () => {
    const label = cloudLabelPosition([]);
    expect(label).toEqual({ x: 0, y: 0 });
  });
});
