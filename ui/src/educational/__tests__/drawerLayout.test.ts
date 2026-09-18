import { describe, it, expect } from "vitest";
import { BADGE_W, COLUMN_W, PAD_X, columnCenterX, badgeCenterX, scrollTargetLeft, totalWidth } from "../drawerLayout";

describe("drawerLayout", () => {
  it("spaces columns by COLUMN_W + BADGE_W and reserves an origin slot", () => {
    expect(columnCenterX(0, false)).toBe(PAD_X + COLUMN_W / 2);
    expect(columnCenterX(1, false) - columnCenterX(0, false)).toBe(COLUMN_W + BADGE_W);
    expect(columnCenterX(0, true) - columnCenterX(0, false)).toBe(BADGE_W);
    expect(badgeCenterX(1, false)).toBe(PAD_X + COLUMN_W + BADGE_W / 2);
    expect(badgeCenterX(0, true)).toBe(PAD_X + BADGE_W / 2);
  });
  it("totalWidth covers all columns and gaps", () => {
    expect(totalWidth(3, false)).toBe(2 * PAD_X + 3 * COLUMN_W + 2 * BADGE_W);
    expect(totalWidth(3, true)).toBe(2 * PAD_X + BADGE_W + 3 * COLUMN_W + 2 * BADGE_W);
    expect(totalWidth(0, false)).toBe(2 * PAD_X);
  });
  it("scrollTargetLeft centers the column and clamps at both ends", () => {
    const n = 8;
    expect(scrollTargetLeft(0, 800, n, false)).toBe(0);
    const mid = scrollTargetLeft(4, 800, n, false);
    expect(mid).toBe(columnCenterX(4, false) - 400);
    expect(scrollTargetLeft(7, 800, n, false)).toBe(totalWidth(n, false) - 800);
    expect(scrollTargetLeft(3, 10000, n, false)).toBe(0);
  });
});
