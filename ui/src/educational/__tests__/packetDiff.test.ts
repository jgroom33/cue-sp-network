import { describe, it, expect } from "vitest";
import { buildLayers } from "../packetLayers";
import { diffPackets } from "../packetDiff";
import type { PacketHeaders, MplsLabel } from "../types";

const eth = { srcMac: "02:00:00:00:00:01", dstMac: "02:00:00:00:00:02", etherType: "0x0800" };
const ip = { src: "10.0.0.1", dst: "10.0.0.2", ttl: 64, dscp: "ef", protocol: "TCP" };
const transport: MplsLabel = { id: "transport", value: 16002, ttl: 63, tc: 0, bottom: false, purpose: "" };
const vpn: MplsLabel = { id: "vpn", value: 100001, ttl: 63, tc: 0, bottom: true, purpose: "" };

const plain: PacketHeaders = { ethernet: eth, ip };
const labeled: PacketHeaders = { ethernet: { ...eth, etherType: "0x8847" }, mpls: [transport, vpn], ip };

describe("diffPackets", () => {
  it("reports pushes in action order and marks both MPLS layers added", () => {
    const d = diffPackets(buildLayers(plain), buildLayers(labeled), [
      { type: "mpls-push", label: vpn },
      { type: "mpls-push", label: transport },
    ]);
    expect(d.addedLayers).toEqual(["mpls:transport", "mpls:vpn"]);
    expect(d.badges.map((b) => b.text)).toEqual(["+MPLS 100001", "+MPLS 16002"]);
    expect(d.mpls.map((m) => m.op)).toEqual(["push", "push"]);
  });
  it("PHP removes the transport layer and leaves the VPN label untouched", () => {
    const after: PacketHeaders = { ...labeled, mpls: [{ ...vpn, bottom: true }] };
    const d = diffPackets(buildLayers(labeled), buildLayers(after), [{ type: "php-pop", label: 16002 }]);
    expect(d.removedLayers.map((l) => l.id)).toEqual(["mpls:transport"]);
    expect(d.changedFields.filter((c) => c.layerId === "mpls:vpn")).toEqual([]);
    expect(d.badges[0]).toMatchObject({ kind: "pop", text: "PHP −MPLS 16002", layerId: "mpls:transport" });
    expect(d.mpls[0]).toMatchObject({ op: "pop", labelId: "transport" });
  });
  it("emits a swap badge from the action even when the value is unchanged", () => {
    const after: PacketHeaders = { ...labeled, mpls: [{ ...transport, ttl: 62 }, vpn] };
    const d = diffPackets(buildLayers(labeled), buildLayers(after), [
      { type: "mpls-swap", from: 16002, to: 16002 },
      { type: "ttl-decrement", from: 63, to: 62 },
    ]);
    expect(d.badges.map((b) => b.text)).toEqual(["swap 16002→16002", "MPLS TTL 63→62"]);
    expect(d.changedFields).toHaveLength(1);
    expect(d.changedFields[0]).toMatchObject({ layerId: "mpls:transport", fieldId: "ttl", semantic: "ttl" });
  });
  it("records a label field change for a real swap", () => {
    const after: PacketHeaders = { ...labeled, mpls: [{ ...transport, value: 16003 }, vpn] };
    const d = diffPackets(buildLayers(labeled), buildLayers(after), [{ type: "mpls-swap", from: 16002, to: 16003 }]);
    expect(d.changedFields[0]).toMatchObject({ fieldId: "label", semantic: "swap", fromRaw: 16002, toRaw: 16003 });
  });
  it("resolves ttl-decrement to IP when no MPLS is present, and merges MAC rewrites", () => {
    const after: PacketHeaders = {
      ethernet: { ...eth, srcMac: "02:00:00:00:00:03", dstMac: "02:00:00:00:00:04" },
      ip: { ...ip, ttl: 63 },
    };
    const d = diffPackets(buildLayers(plain), buildLayers(after), [{ type: "ttl-decrement", from: 64, to: 63 }]);
    expect(d.badges.map((b) => b.text)).toEqual(["IP TTL 64→63", "MAC rewrite"]);
    expect(d.badges[0].layerId).toBe("ip");
  });
  it("produces residual TTL and DSCP badges without actions", () => {
    const after: PacketHeaders = { ethernet: eth, ip: { ...ip, ttl: 63, dscp: "af41" } };
    const d = diffPackets(buildLayers(plain), buildLayers(after), []);
    expect(d.badges.map((b) => b.text)).toEqual(["IP TTL 64→63", "DSCP EF→AF41"]);
  });
  it("handles S-TAG push / pop as layer add / remove", () => {
    const tagged: PacketHeaders = { ethernet: { ...eth, sVlan: 100 }, ip };
    const push = diffPackets(buildLayers(plain), buildLayers(tagged), [{ type: "qinq-push", svlan: 100 }]);
    expect(push.addedLayers).toEqual(["eth.stag"]);
    expect(push.badges[0]).toMatchObject({ kind: "vlan-push", text: "+S-VLAN 100" });
    const pop = diffPackets(buildLayers(tagged), buildLayers(plain), [{ type: "qinq-pop", svlan: 100 }]);
    expect(pop.removedLayers.map((l) => l.id)).toEqual(["eth.stag"]);
  });
  it("VXLAN encap adds the outer layers without a spurious MAC rewrite badge", () => {
    const encap: PacketHeaders = {
      ethernet: { srcMac: "02:00:00:00:00:09", dstMac: "02:00:00:00:00:0a", etherType: "0x8847" },
      innerEthernet: eth,
      mpls: [{ ...transport, bottom: true }],
      ip,
      vxlan: { outerSrcIp: "1.1.1.1", outerDstIp: "2.2.2.2", outerSrcPort: 49152, outerDstPort: 4789, vni: 10100 },
    };
    const d = diffPackets(buildLayers(plain), buildLayers(encap), [
      { type: "vxlan-encap", vni: 10100, outerDst: "2.2.2.2" },
      { type: "mpls-push", label: { ...transport, bottom: true } },
    ]);
    expect(d.addedLayers).toEqual(["mpls:transport", "ip-outer", "udp", "vxlan", "eth-inner", "eth-inner.type"]);
    expect(d.badges.map((b) => b.kind)).toEqual(["encap", "push"]);
  });
  it("hop 0 has no added layers and only action badges", () => {
    const d = diffPackets(undefined, buildLayers(labeled), [{ type: "mpls-push", label: transport }]);
    expect(d.addedLayers).toEqual([]);
    expect(d.prevLayerIds).toEqual([]);
    expect(d.badges.map((b) => b.text)).toEqual(["+MPLS 16002"]);
  });
});
