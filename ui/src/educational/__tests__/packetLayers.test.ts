import { describe, it, expect } from "vitest";
import { buildLayers, dscpToCodepoint, protocolToNumber, PAYLOAD_BYTES } from "../packetLayers";
import type { PacketHeaders } from "../types";

const eth = { srcMac: "02:00:00:00:00:01", dstMac: "02:00:00:00:00:02", etherType: "0x0800" };
const ip = { src: "10.0.0.1", dst: "10.0.0.2", ttl: 64, dscp: "ef", protocol: "TCP" };

const bits = (l: { fields: { bits: number }[] }) => l.fields.reduce((a, f) => a + f.bits, 0);

describe("buildLayers", () => {
  it("orders plain IP: eth, eth.type, ip, payload", () => {
    const layers = buildLayers({ ethernet: eth, ip });
    expect(layers.map((l) => l.id)).toEqual(["eth", "eth.type", "ip", "payload"]);
    expect(layers.map((l) => l.byteLength)).toEqual([12, 2, 20, PAYLOAD_BYTES]);
  });
  it("every layer is byte aligned and byteLength matches bits", () => {
    const h: PacketHeaders = {
      ethernet: { ...eth, sVlan: 100, etherType: "0x8847" },
      mpls: [
        { id: "transport", value: 16002, ttl: 63, tc: 5, bottom: false, purpose: "" },
        { id: "vpn", value: 100001, ttl: 63, tc: 5, bottom: true, purpose: "" },
      ],
      ip,
      vxlan: { outerSrcIp: "1.1.1.1", outerDstIp: "2.2.2.2", outerSrcPort: 49152, outerDstPort: 4789, vni: 10100 },
      innerEthernet: { srcMac: "02:aa:00:00:00:01", dstMac: "02:aa:00:00:00:02", etherType: "0x0800" },
    };
    for (const l of buildLayers(h)) {
      expect(bits(l) % 8).toBe(0);
      expect(bits(l) / 8).toBe(l.byteLength);
    }
  });
  it("places MPLS entries top-first with S bit only on the bottom", () => {
    const layers = buildLayers({
      ethernet: { ...eth, etherType: "0x8847" },
      mpls: [
        { id: "transport", value: 16002, ttl: 63, tc: 0, bottom: false, purpose: "" },
        { id: "vpn", value: 100001, ttl: 63, tc: 0, bottom: true, purpose: "" },
      ],
      ip,
    });
    const ids = layers.map((l) => l.id);
    expect(ids).toEqual(["eth", "eth.type", "mpls:transport", "mpls:vpn", "ip", "payload"]);
    const s = (id: string) => layers.find((l) => l.id === id)!.fields.find((f) => f.id === "s")!.raw;
    expect(s("mpls:transport")).toBe(0);
    expect(s("mpls:vpn")).toBe(1);
    expect(layers[1].fields[0].raw).toBe(0x8847);
  });
  it("inserts the S-TAG between addresses and EtherType, inferring legacy 0x88a8", () => {
    const layers = buildLayers({ ethernet: { ...eth, sVlan: 100, etherType: "0x88a8" }, ip });
    expect(layers.map((l) => l.id)).toEqual(["eth", "eth.stag", "eth.type", "ip", "payload"]);
    expect(layers[1].fields.find((f) => f.id === "vid")!.raw).toBe(100);
    expect(layers[1].fields.find((f) => f.id === "tpid")!.raw).toBe(0x88a8);
    expect(layers[2].fields[0].raw).toBe(0x0800); // inferred payload type, not the TPID
  });
  it("builds VXLAN outer IP/UDP/VXLAN and an inner Ethernet with correct lengths", () => {
    const layers = buildLayers({
      ethernet: { ...eth, etherType: "0x8847" },
      mpls: [{ id: "transport", value: 16002, ttl: 63, tc: 0, bottom: true, purpose: "" }],
      ip,
      vxlan: { outerSrcIp: "1.1.1.1", outerDstIp: "2.2.2.2", outerSrcPort: 49152, outerDstPort: 4789, vni: 10100 },
      innerEthernet: { srcMac: "02:aa:00:00:00:01", dstMac: "02:aa:00:00:00:02", etherType: "0x0800" },
    });
    expect(layers.map((l) => l.id)).toEqual([
      "eth", "eth.type", "mpls:transport", "ip-outer", "udp", "vxlan", "eth-inner", "eth-inner.type", "ip", "payload",
    ]);
    const by = (id: string) => layers.find((l) => l.id === id)!;
    const totlen = (id: string) => by(id).fields.find((f) => f.id === "totalLength")!.raw;
    expect(totlen("ip")).toBe(20 + PAYLOAD_BYTES);
    // outer IP total = 20 + udp 8 + vxlan 8 + inner eth 14 + inner ip 20 + payload
    expect(totlen("ip-outer")).toBe(20 + 8 + 8 + 14 + 20 + PAYLOAD_BYTES);
    expect(by("udp").fields.find((f) => f.id === "length")!.raw).toBe(8 + 8 + 14 + 20 + PAYLOAD_BYTES);
    expect(by("vxlan").fields.find((f) => f.id === "vni")!.raw).toBe(10100);
  });
  it("adds a PW control word when the pseudowire has one", () => {
    const layers = buildLayers({
      ethernet: { ...eth, etherType: "0x8847" },
      mpls: [{ id: "pw", value: 1001, ttl: 255, tc: 0, bottom: true, purpose: "" }],
      pseudowire: { pwLabel: 1001, controlWord: true },
      innerEthernet: { srcMac: "02:aa:00:00:00:01", dstMac: "02:aa:00:00:00:02", etherType: "0x0800" },
      ip,
    });
    expect(layers.map((l) => l.id)).toEqual(["eth", "eth.type", "mpls:pw", "pwcw", "eth-inner", "eth-inner.type", "ip", "payload"]);
    expect(layers.find((l) => l.id === "pwcw")!.byteLength).toBe(4);
  });
  it("keeps untouched layer ids stable across a push", () => {
    const before = buildLayers({ ethernet: eth, ip }).map((l) => l.id);
    const after = buildLayers({
      ethernet: { ...eth, etherType: "0x8847" },
      mpls: [{ id: "transport", value: 16002, ttl: 63, tc: 0, bottom: true, purpose: "" }],
      ip,
    }).map((l) => l.id);
    expect(before.filter((id) => after.includes(id))).toEqual(before);
  });
});

describe("dscp / protocol tables", () => {
  it("maps names to codepoints", () => {
    expect(dscpToCodepoint("ef")).toBe(46);
    expect(dscpToCodepoint("cs6")).toBe(48);
    expect(dscpToCodepoint("af41")).toBe(34);
    expect(dscpToCodepoint("be")).toBe(0);
    expect(dscpToCodepoint("12")).toBe(12);
  });
  it("maps protocol strings", () => {
    expect(protocolToNumber("TCP")).toBe(6);
    expect(protocolToNumber("TCP/179 (BGP)")).toBe(6);
    expect(protocolToNumber("UDP")).toBe(17);
  });
});
