import { describe, it, expect } from "vitest";
import { buildLayers } from "../packetLayers";
import { diffPackets } from "../packetDiff";
import { fieldPath, fitText, layoutLayer, layoutPacket, SIZES } from "../packetSvgLayout";
import type { PacketHeaders } from "../types";

const eth = { srcMac: "02:00:00:00:00:01", dstMac: "02:00:00:00:00:02", etherType: "0x0800" };
const ip = { src: "10.0.0.1", dst: "10.0.0.2", ttl: 64, dscp: "ef", protocol: "TCP" };
const plain: PacketHeaders = { ethernet: eth, ip };
const labeled: PacketHeaders = {
  ethernet: { ...eth, etherType: "0x8847" },
  mpls: [
    { id: "transport", value: 16002, ttl: 63, tc: 0, bottom: false, purpose: "" },
    { id: "vpn", value: 100001, ttl: 63, tc: 0, bottom: true, purpose: "" },
  ],
  ip,
};

describe("fieldPath", () => {
  it("draws a rect for a single-row field", () => {
    expect(fieldPath(0, 16, 10, 20)).toBe("M0,0H160V20H0Z");
  });
  it("draws a stair polygon for a 48-bit field starting at bit 16", () => {
    const p = fieldPath(48, 96, 10, 20); // src MAC after dst MAC
    expect(p.startsWith("M160,20H320V40")).toBe(true);
    expect(p.endsWith("Z")).toBe(true);
    expect(p).toContain("H0");
  });
});

describe("layoutLayer", () => {
  it("grid height is title + ceil(bits/32) rows", () => {
    const layers = buildLayers(plain);
    const ipLayer = layers.find((l) => l.id === "ip")!;
    const g = layoutLayer(ipLayer, SIZES.full, "grid", 0);
    expect(g.height).toBe(SIZES.full.titleH + 5 * SIZES.full.rowH);
    expect(g.fields.find((f) => f.field.id === "src")!.rows).toBe(1);
  });
  it("a continuation layer has no title height", () => {
    const type = buildLayers(plain).find((l) => l.id === "eth.type")!;
    expect(layoutLayer(type, SIZES.compact, "grid", 0).height).toBe(SIZES.compact.rowH);
  });
});

describe("layoutPacket", () => {
  it("compact collapses untouched non-MPLS layers into strips", () => {
    const prev = buildLayers(labeled);
    const next = buildLayers({ ...labeled, mpls: [{ ...labeled.mpls![0], ttl: 62 }, labeled.mpls![1]] });
    const diff = diffPackets(prev, next, [{ type: "ttl-decrement", from: 63, to: 62 }]);
    const geom = layoutPacket(next, diff, "compact", { detail: "compact" });
    const mode = (id: string) => geom.layers.find((g) => g.layer.id === id)!.mode;
    expect(mode("ip")).toBe("strip");
    expect(mode("eth")).toBe("strip");
    expect(mode("mpls:transport")).toBe("grid");
    expect(mode("mpls:vpn")).toBe("grid");
    expect(geom.width).toBe(32 * SIZES.compact.bitW);
  });
  it("full renders everything as a grid and stacks without overlap", () => {
    const geom = layoutPacket(buildLayers(labeled), undefined, "full", { detail: "full", ruler: true });
    for (let i = 1; i < geom.layers.length; i++) {
      expect(geom.layers[i].y).toBeGreaterThanOrEqual(geom.layers[i - 1].y + geom.layers[i - 1].height);
    }
    expect(geom.layers.every((g) => g.mode === "grid" || g.layer.kind === "payload")).toBe(true);
    expect(geom.height).toBe(geom.layers.at(-1)!.y + geom.layers.at(-1)!.height);
  });
  it("places a removed top-of-stack ghost where the surviving label now sits", () => {
    const prev = buildLayers(labeled);
    const next = buildLayers({ ...labeled, mpls: [{ ...labeled.mpls![1], bottom: true }] });
    const diff = diffPackets(prev, next, [{ type: "php-pop", label: 16002 }]);
    const geom = layoutPacket(next, diff, "full", { detail: "full" });
    expect(geom.ghosts).toHaveLength(1);
    expect(geom.ghosts[0].layer.id).toBe("mpls:transport");
    expect(geom.ghosts[0].y).toBe(geom.layers.find((g) => g.layer.id === "mpls:vpn")!.y);
  });
  it("places a removed S-TAG ghost at the EtherType row", () => {
    const tagged: PacketHeaders = { ethernet: { ...eth, sVlan: 100 }, ip };
    const diff = diffPackets(buildLayers(tagged), buildLayers(plain), [{ type: "qinq-pop", svlan: 100 }]);
    const geom = layoutPacket(buildLayers(plain), diff, "full", { detail: "full" });
    expect(geom.ghosts[0].y).toBe(geom.layers.find((g) => g.layer.id === "eth.type")!.y);
  });
});

describe("fitText", () => {
  it("keeps short text, truncates MACs from the left and IPs from the right", () => {
    expect(fitText("10.0.0.1", 100, 10)).toBe("10.0.0.1");
    expect(fitText("02:ab:cd:ef:12:01", 54, 10, "mac")).toBe("…ef:12:01");
    expect(fitText("192.168.100.200", 48, 10, "ip")).toBe("192.168…");
    expect(fitText("abcdefghijkl", 42, 10)).toBe("abc…jkl");
    expect(fitText("abc", 5, 10)).toBe("");
  });
});
