import { describe, it, expect } from "vitest";
import { buildLayers } from "../packetLayers";
import {
  packFields,
  ipv4Checksum,
  serializePacket,
  toHexRows,
  macToNumber,
  numberToMac,
  ipv4ToNumber,
  numberToIpv4,
} from "../packetBytes";
import type { PacketHeaders } from "../types";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(" ");

const headers: PacketHeaders = {
  ethernet: { srcMac: "02:00:00:00:00:01", dstMac: "02:00:00:00:00:02", etherType: "0x8847" },
  mpls: [{ id: "transport", value: 16002, ttl: 63, tc: 0, bottom: true, purpose: "t" }],
  ip: { src: "10.0.0.1", dst: "10.0.0.2", ttl: 64, dscp: "ef", protocol: "TCP" },
};

describe("packFields", () => {
  it("packs MSB-first across byte boundaries", () => {
    expect(hex(packFields([{ bits: 20, raw: 16002 }, { bits: 3, raw: 0 }, { bits: 1, raw: 1 }, { bits: 8, raw: 63 }]))).toBe("03 e8 21 3f");
    expect(hex(packFields([{ bits: 48, raw: macToNumber("02:00:00:00:00:02") }]))).toBe("02 00 00 00 00 02");
  });
  it("throws on non byte-aligned input", () => {
    expect(() => packFields([{ bits: 3, raw: 1 }])).toThrow();
  });
});

describe("ipv4Checksum", () => {
  it("computes the RFC 1071 checksum and verifies to zero", () => {
    const hdr = new Uint8Array([0x45, 0xb8, 0x00, 0x54, 0x1a, 0x2b, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0x0a, 0, 0, 1, 0x0a, 0, 0, 2]);
    const c = ipv4Checksum(hdr);
    expect(c).toBe(0x0bbf);
    hdr[10] = c >> 8;
    hdr[11] = c & 0xff;
    expect(ipv4Checksum(hdr)).toBe(0);
  });
});

describe("serializePacket (known answer)", () => {
  const layers = buildLayers(headers);
  const pkt = serializePacket(layers);
  it("emits Ethernet + MPLS + IPv4 + payload bytes in wire order", () => {
    expect(hex(pkt.bytes.slice(0, 14))).toBe("02 00 00 00 00 02 02 00 00 00 00 01 88 47");
    expect(hex(pkt.bytes.slice(14, 18))).toBe("03 e8 21 3f");
    expect(hex(pkt.bytes.slice(18, 38))).toBe("45 b8 00 54 1a 2b 40 00 40 06 0b bf 0a 00 00 01 0a 00 00 02");
    expect(pkt.bytes.length).toBe(14 + 4 + 20 + 64);
  });
  it("attributes every byte to a layer/field", () => {
    expect(pkt.owners.length).toBe(pkt.bytes.length);
    expect(pkt.owners[14].layerId).toBe("mpls:transport");
    expect(pkt.owners[0].fieldId).toBe("dst");
    expect(pkt.owners[6].fieldId).toBe("src");
    expect(pkt.owners[12].layerId).toBe("eth.type");
    expect(pkt.layerRanges.get("ip")).toEqual([18, 38]);
    expect(pkt.layerRanges.get("payload")).toEqual([38, 102]);
  });
  it("produces 16-byte hex rows", () => {
    const rows = toHexRows(pkt);
    expect(rows.length).toBe(7);
    expect(rows[6].cells.length).toBe(6);
    expect(rows[0].cells[0].hex).toBe("02");
    expect(rows[0].offset).toBe(0);
    expect(rows[1].offset).toBe(16);
  });
});

describe("address helpers", () => {
  it("round-trips MACs and IPv4 addresses", () => {
    expect(numberToMac(macToNumber("02:ab:cd:ef:12:01"))).toBe("02:ab:cd:ef:12:01");
    expect(numberToIpv4(ipv4ToNumber("192.168.100.20"))).toBe("192.168.100.20");
    expect(ipv4ToNumber("10.0.0.1")).toBe(0x0a000001);
  });
});
