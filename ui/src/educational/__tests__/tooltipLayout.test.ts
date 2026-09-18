import { describe, it, expect } from "vitest";
import { placeTooltip } from "../tooltipLayout";

const vp = { w: 1200, h: 800 };
const tip = { w: 200, h: 60 };

describe("placeTooltip", () => {
  it("prefers sitting above the anchor, centred", () => {
    const p = placeTooltip({ left: 500, top: 400, width: 100, height: 20 }, tip, vp);
    expect(p.placement).toBe("above");
    expect(p.top).toBe(400 - 8 - 60);
    expect(p.left).toBe(500 + 50 - 100);
  });
  it("flips below when there is no room above", () => {
    const p = placeTooltip({ left: 500, top: 30, width: 100, height: 20 }, tip, vp);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(30 + 20 + 8);
  });
  it("clamps to the left and right viewport edges", () => {
    expect(placeTooltip({ left: 10, top: 400, width: 20, height: 20 }, tip, vp).left).toBe(4);
    expect(placeTooltip({ left: 1190, top: 400, width: 20, height: 20 }, tip, vp).left).toBe(1200 - 200 - 4);
  });
});
