import { describe, it, expect } from "vitest";
import { buildLayers } from "../packetLayers";
import { serializePacket } from "../packetBytes";
import { diffPackets, splitFieldKey } from "../packetDiff";
import { describeField } from "../packetFieldInfo";
import type { HopModel } from "../packetModels";
import type { PacketHeaders } from "../types";

const eth = { srcMac: "02:00:00:00:00:01", dstMac: "02:00:00:00:00:02", etherType: "0x0800" };
const ip = { src: "10.0.0.1", dst: "10.0.0.2", ttl: 64, dscp: "ef", protocol: "TCP" };

function hop(prev: PacketHeaders | undefined, next: PacketHeaders): HopModel {
  const layers = buildLayers(next);
  return {
    layers,
    bytes: serializePacket(layers),
    diff: diffPackets(prev ? buildLayers(prev) : undefined, layers, []),
  };
}

describe("splitFieldKey", () => {
  it("splits on the last dot so dotted layer ids survive", () => {
    expect(splitFieldKey("eth.stag.vid")).toEqual(["eth.stag", "vid"]);
    expect(splitFieldKey("mpls:transport.label")).toEqual(["mpls:transport", "label"]);
    expect(splitFieldKey("ip.ttl")).toEqual(["ip", "ttl"]);
  });
});

describe("describeField", () => {
  it("reports the previous value and byte offset for a decremented TTL", () => {
    const m = hop({ ethernet: eth, ip }, { ethernet: eth, ip: { ...ip, ttl: 63 } });
    const info = describeField(m, "ip.ttl")!;
    expect(info.layerName).toBe("IPv4");
    expect(info.name).toBe("Time To Live");
    expect(info.display).toBe("63");
    expect(info.prev).toBe("64");
    expect(info.bits).toBe(8);
    expect(info.bitStart).toBe(64);
    expect(info.byteStart).toBe(14 + 8);
    expect(info.byteEnd).toBe(14 + 9);
    expect(info.added).toBeUndefined();
  });
  it("flags fields of a layer added at this hop", () => {
    const m = hop(
      { ethernet: eth, ip },
      { ethernet: { ...eth, sVlan: 100 }, ip }
    );
    const info = describeField(m, "eth.stag.vid")!;
    expect(info.added).toBe(true);
    expect(info.prev).toBeUndefined();
    expect(info.bitStart).toBe(20);
    expect(info.byteStart).toBe(12 + 2); // eth = 12 bytes of MACs, tag follows
    expect(info.byteEnd).toBe(12 + 4);
    expect(info.bitInByte).toBe(4);
  });
  it("describes the payload as a whole", () => {
    const m = hop(undefined, { ethernet: eth, ip });
    const info = describeField(m, "payload.data")!;
    expect(info.name).toBe("Payload");
    expect(info.byteStart).toBe(34);
    expect(info.byteEnd).toBe(34 + 64);
  });
  it("returns undefined for unknown keys", () => {
    const m = hop(undefined, { ethernet: eth, ip });
    expect(describeField(m, "vxlan.vni")).toBeUndefined();
    expect(describeField(m, "ip.nope")).toBeUndefined();
  });
});
