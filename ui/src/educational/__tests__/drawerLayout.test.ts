import { describe, it, expect } from "vitest";
import {
  BADGE_W,
  COL_PAD,
  DRAWER_HANDLE_H,
  DRAWER_MIN_H,
  PAD_X,
  clampDrawerHeight,
  columnWidthFor,
  drawerHeight,
  makeDrawerLayout,
} from "../drawerLayout";
import { GRID_BITS, SIZES } from "../packetSvgLayout";

describe("columnWidthFor", () => {
  it("is the 32-bit grid plus inner padding for each density", () => {
    expect(columnWidthFor("compact")).toBe(GRID_BITS * SIZES.compact.bitW + 2 * COL_PAD); // 224
    expect(columnWidthFor("compact")).toBe(224);
    expect(columnWidthFor("drawer")).toBe(272);
    expect(columnWidthFor("full")).toBe(368);
  });
});

describe("makeDrawerLayout (uniform columns)", () => {
  const W = columnWidthFor("compact");
  it("spaces columns by column width + BADGE_W and reserves an origin slot", () => {
    const l = makeDrawerLayout({ n: 3, hasOrigin: false, size: "compact" });
    const lo = makeDrawerLayout({ n: 3, hasOrigin: true, size: "compact" });
    expect(l.columnWidth(0)).toBe(224);
    expect(l.columnCenterX(0)).toBe(PAD_X + W / 2);
    expect(l.columnCenterX(1) - l.columnCenterX(0)).toBe(W + BADGE_W);
    expect(lo.columnCenterX(0) - l.columnCenterX(0)).toBe(BADGE_W);
    expect(l.badgeCenterX(1)).toBe(PAD_X + W + BADGE_W / 2);
    expect(lo.badgeCenterX(0)).toBe(PAD_X + BADGE_W / 2);
  });
  it("totalWidth covers all columns and gaps", () => {
    expect(makeDrawerLayout({ n: 3, hasOrigin: false, size: "compact" }).totalWidth).toBe(
      2 * PAD_X + 3 * W + 2 * BADGE_W
    );
    expect(makeDrawerLayout({ n: 3, hasOrigin: true, size: "compact" }).totalWidth).toBe(
      2 * PAD_X + BADGE_W + 3 * W + 2 * BADGE_W
    );
    expect(makeDrawerLayout({ n: 0, hasOrigin: false, size: "compact" }).totalWidth).toBe(2 * PAD_X);
  });
  it("scrollTargetLeft centers the column and clamps at both ends", () => {
    const l = makeDrawerLayout({ n: 8, hasOrigin: false, size: "compact" });
    expect(l.scrollTargetLeft(0, 800)).toBe(0);
    expect(l.scrollTargetLeft(4, 800)).toBe(l.columnCenterX(4) - 400);
    expect(l.scrollTargetLeft(7, 800)).toBe(l.totalWidth - 800);
    expect(l.scrollTargetLeft(3, 10000)).toBe(0);
  });
  it("uses the requested density for every column", () => {
    const l = makeDrawerLayout({ n: 2, hasOrigin: false, size: "drawer" });
    expect(l.sizeFor(0)).toBe("drawer");
    expect(l.columnWidth(1)).toBe(272);
  });
});

describe("makeDrawerLayout (expanded active column)", () => {
  const l = makeDrawerLayout({ n: 4, hasOrigin: false, size: "drawer", activeHop: 1, expandActive: true });
  const base = makeDrawerLayout({ n: 4, hasOrigin: false, size: "drawer" });
  it("renders only the active hop at full size", () => {
    expect(l.sizeFor(0)).toBe("drawer");
    expect(l.sizeFor(1)).toBe("full");
    expect(l.columnWidth(1)).toBe(368);
    expect(l.columnWidth(2)).toBe(272);
  });
  it("keeps every column one width + badge apart", () => {
    for (let i = 0; i < 3; i++) {
      expect(l.columnX(i + 1) - l.columnX(i)).toBe(l.columnWidth(i) + BADGE_W);
    }
    expect(l.columnCenterX(1)).toBe(l.columnX(1) + 368 / 2);
  });
  it("grows the total width by the extra column width only", () => {
    expect(l.totalWidth - base.totalWidth).toBe(368 - 272);
    expect(l.totalWidth).toBe(2 * PAD_X + 3 * 272 + 368 + 3 * BADGE_W);
  });
  it("centres the wide column", () => {
    expect(l.scrollTargetLeft(1, 600)).toBe(l.columnCenterX(1) - 300);
  });
  it("ignores expandActive without a valid active hop", () => {
    const none = makeDrawerLayout({ n: 3, hasOrigin: false, size: "drawer", expandActive: true });
    expect(none.totalWidth).toBe(makeDrawerLayout({ n: 3, hasOrigin: false, size: "drawer" }).totalWidth);
  });
});

describe("drawer height helpers", () => {
  it("clamps between the minimum and 60% of the viewport", () => {
    expect(clampDrawerHeight(50, 1000)).toBe(DRAWER_MIN_H);
    expect(clampDrawerHeight(900, 1000)).toBe(600);
    expect(clampDrawerHeight(333.4, 1000)).toBe(333);
    // tiny viewports never push the max below the min
    expect(clampDrawerHeight(500, 100)).toBe(DRAWER_MIN_H);
  });
  it("adds the handle only when open", () => {
    expect(drawerHeight(true, 300)).toBe(300 + DRAWER_HANDLE_H);
    expect(drawerHeight(false, 300)).toBe(DRAWER_HANDLE_H);
  });
});
