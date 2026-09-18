import { describe, it, expect } from "vitest";
import { loadDrawerPrefs, saveDrawerPrefs } from "../drawerPrefs";

describe("drawerPrefs without browser storage", () => {
  it("loads nothing and saves silently", () => {
    expect(typeof localStorage).toBe("undefined");
    expect(loadDrawerPrefs()).toEqual({});
    expect(() => saveDrawerPrefs({ size: "full", height: 400 })).not.toThrow();
  });
});
