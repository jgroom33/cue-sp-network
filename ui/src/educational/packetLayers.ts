import type { PacketHeaders, MplsLabel } from "./types";
import type { ProtocolColorKey } from "../utils/colors";
import { ipv4Checksum, ipv4ToNumber, macToNumber, packFields } from "./packetBytes";

/**
 * Turn semantic PacketHeaders into an ordered, wire-accurate list of layers
 * with RFC-style bit fields. Pure; safe to call in tests.
 */

export type LayerKind =
  | "ethernet"
  | "stag"
  | "ctag"
  | "ethtype"
  | "mpls"
  | "ipv4"
  | "udp"
  | "vxlan"
  | "pwcw"
  | "payload";

export type FieldRole =
  | "key"
  | "ttl"
  | "dscp"
  | "checksum"
  | "length"
  | "flag"
  | "addr"
  | "normal";

export interface PacketField {
  id: string; // layer-scoped, stable
  name: string; // long name
  short: string; // grid label
  bits: number;
  raw: number; // value on the wire
  display: string; // full value text
  compact: string; // short value text
  role: FieldRole;
}

export interface PacketLayer {
  id: string; // stable React key across hops
  kind: LayerKind;
  name: string;
  subtitle?: string;
  summary: string; // one-line strip text for untouched layers
  color: ProtocolColorKey;
  /** Drawn as a continuation of the previous layer (no title, no gap). */
  continuation?: boolean;
  fields: PacketField[];
  byteLength: number;
  payload?: Uint8Array;
}

export const PAYLOAD_BYTES = 64;
const PAYLOAD_TEXT = "SP-NET educational payload: customer application data ....";

export function dscpToCodepoint(dscp: string): number {
  const d = dscp.trim().toLowerCase();
  if (d === "" || d === "be" || d === "default") return 0;
  if (d === "ef") return 46;
  if (d === "va") return 44;
  const cs = /^cs([0-7])$/.exec(d);
  if (cs) return parseInt(cs[1], 10) * 8;
  const af = /^af([1-4])([1-3])$/.exec(d);
  if (af) return parseInt(af[1], 10) * 8 + parseInt(af[2], 10) * 2;
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n & 0x3f : 0;
}

export function protocolToNumber(p: string): number {
  const s = p.toLowerCase();
  if (s.startsWith("tcp")) return 6;
  if (s.startsWith("udp")) return 17;
  if (s.startsWith("icmp")) return 1;
  if (s.startsWith("gre")) return 47;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n & 0xff : 253;
}

function parseEtherType(t: string): number {
  const n = parseInt(t, 16);
  return Number.isFinite(n) ? n & 0xffff : 0x0800;
}

function hex16(n: number): string {
  return "0x" + n.toString(16).padStart(4, "0");
}

function macCompact(mac: string): string {
  const parts = mac.split(":");
  return parts.length === 6 ? "…" + parts.slice(3).join(":") : mac;
}

function etherTypeName(n: number): string {
  switch (n) {
    case 0x0800: return "IPv4";
    case 0x8847: return "MPLS";
    case 0x88a8: return "802.1ad";
    case 0x8100: return "802.1Q";
    case 0x0806: return "ARP";
    case 0x86dd: return "IPv6";
    default: return hex16(n);
  }
}

const f = (
  id: string,
  name: string,
  short: string,
  bits: number,
  raw: number,
  display: string,
  compact: string,
  role: FieldRole = "normal"
): PacketField => ({ id, name, short, bits, raw, display, compact, role });

function bytesOf(fields: PacketField[]): number {
  const bits = fields.reduce((a, x) => a + x.bits, 0);
  if (bits % 8 !== 0) throw new Error(`layer not byte aligned: ${bits} bits`);
  return bits / 8;
}

function ethernetLayers(
  idBase: string,
  eth: { srcMac: string; dstMac: string; etherType: string; sVlan?: number; cVlan?: number },
  payloadType: number,
  pcp: number,
  nameSuffix: string
): PacketLayer[] {
  const out: PacketLayer[] = [];
  const addrFields = [
    f("dst", "Destination MAC", "Dst MAC", 48, macToNumber(eth.dstMac), eth.dstMac, macCompact(eth.dstMac), "addr"),
    f("src", "Source MAC", "Src MAC", 48, macToNumber(eth.srcMac), eth.srcMac, macCompact(eth.srcMac), "addr"),
  ];
  out.push({
    id: idBase,
    kind: "ethernet",
    name: `Ethernet II${nameSuffix}`,
    summary: `${macCompact(eth.srcMac)} → ${macCompact(eth.dstMac)}`,
    color: "eth",
    fields: addrFields,
    byteLength: bytesOf(addrFields),
  });
  if (eth.sVlan !== undefined) {
    const fields = [
      f("tpid", "TPID", "TPID", 16, 0x88a8, "0x88a8 (802.1ad)", "88a8", "key"),
      f("pcp", "Priority Code Point", "PCP", 3, pcp, String(pcp), String(pcp), "dscp"),
      f("dei", "Drop Eligible", "DEI", 1, 0, "0", "0", "flag"),
      f("vid", "S-VLAN ID", "VID", 12, eth.sVlan, String(eth.sVlan), String(eth.sVlan), "key"),
    ];
    out.push({
      id: `${idBase}.stag`,
      kind: "stag",
      name: "802.1ad S-TAG",
      subtitle: `S-VLAN ${eth.sVlan}`,
      summary: `S-VLAN ${eth.sVlan} PCP ${pcp}`,
      color: "vlan",
      continuation: true,
      fields,
      byteLength: bytesOf(fields),
    });
  }
  if (eth.cVlan !== undefined) {
    const fields = [
      f("tpid", "TPID", "TPID", 16, 0x8100, "0x8100 (802.1Q)", "8100", "key"),
      f("pcp", "Priority Code Point", "PCP", 3, pcp, String(pcp), String(pcp), "dscp"),
      f("dei", "Drop Eligible", "DEI", 1, 0, "0", "0", "flag"),
      f("vid", "C-VLAN ID", "VID", 12, eth.cVlan, String(eth.cVlan), String(eth.cVlan), "key"),
    ];
    out.push({
      id: `${idBase}.ctag`,
      kind: "ctag",
      name: "802.1Q C-TAG",
      subtitle: `C-VLAN ${eth.cVlan}`,
      summary: `C-VLAN ${eth.cVlan}`,
      color: "vlan",
      continuation: true,
      fields,
      byteLength: bytesOf(fields),
    });
  }
  const typeFields = [
    f("type", "EtherType", "Type", 16, payloadType, `${hex16(payloadType)} (${etherTypeName(payloadType)})`, etherTypeName(payloadType), "key"),
  ];
  out.push({
    id: `${idBase}.type`,
    kind: "ethtype",
    name: "EtherType",
    summary: etherTypeName(payloadType),
    color: "eth",
    continuation: true,
    fields: typeFields,
    byteLength: 2,
  });
  return out;
}

function mplsLayer(label: MplsLabel, index: number): PacketLayer {
  const fields = [
    f("label", "Label", "Label", 20, label.value, String(label.value), String(label.value), "key"),
    f("tc", "Traffic Class", "TC", 3, label.tc, String(label.tc), String(label.tc), "dscp"),
    f("s", "Bottom of Stack", "S", 1, label.bottom ? 1 : 0, label.bottom ? "1" : "0", label.bottom ? "1" : "0", "flag"),
    f("ttl", "Time To Live", "TTL", 8, label.ttl, String(label.ttl), String(label.ttl), "ttl"),
  ];
  return {
    id: `mpls:${label.id}`,
    kind: "mpls",
    name: index === 0 ? "MPLS (top)" : "MPLS",
    subtitle: label.purpose,
    summary: `Label ${label.value} TTL ${label.ttl}${label.bottom ? " S" : ""}`,
    color: "mpls",
    fields,
    byteLength: bytesOf(fields),
  };
}

function ipv4Layer(
  id: string,
  ip: { src: string; dst: string; ttl: number; dscp: string; protocol: string },
  totalLength: number,
  nameSuffix: string
): PacketLayer {
  const dscp = dscpToCodepoint(ip.dscp);
  const proto = protocolToNumber(ip.protocol);
  const fields = [
    f("version", "Version", "Ver", 4, 4, "4", "4"),
    f("ihl", "Header Length", "IHL", 4, 5, "5 (20 bytes)", "5", "length"),
    f("dscp", "DSCP", "DSCP", 6, dscp, `${ip.dscp.toUpperCase()} (${dscp})`, ip.dscp.toUpperCase(), "dscp"),
    f("ecn", "ECN", "ECN", 2, 0, "0", "0", "flag"),
    f("totalLength", "Total Length", "Len", 16, totalLength, String(totalLength), String(totalLength), "length"),
    f("id", "Identification", "ID", 16, 0x1a2b, "0x1a2b", "1a2b"),
    f("flags", "Flags", "Flags", 3, 0b010, "DF", "DF", "flag"),
    f("fragOffset", "Fragment Offset", "Frag", 13, 0, "0", "0"),
    f("ttl", "Time To Live", "TTL", 8, ip.ttl, String(ip.ttl), String(ip.ttl), "ttl"),
    f("protocol", "Protocol", "Proto", 8, proto, `${ip.protocol} (${proto})`, ip.protocol.split("/")[0], "key"),
    f("checksum", "Header Checksum", "Cksum", 16, 0, "0x0000", "0000", "checksum"),
    f("src", "Source Address", "Src IP", 32, ipv4ToNumber(ip.src), ip.src, ip.src, "addr"),
    f("dst", "Destination Address", "Dst IP", 32, ipv4ToNumber(ip.dst), ip.dst, ip.dst, "addr"),
  ];
  const cks = ipv4Checksum(packFields(fields));
  const ck = fields.find((x) => x.id === "checksum")!;
  ck.raw = cks;
  ck.display = hex16(cks);
  ck.compact = cks.toString(16).padStart(4, "0");
  return {
    id,
    kind: "ipv4",
    name: `IPv4${nameSuffix}`,
    subtitle: `${ip.protocol} · DSCP ${ip.dscp.toUpperCase()}`,
    summary: `${ip.src} → ${ip.dst}  TTL ${ip.ttl}`,
    color: "ip",
    fields,
    byteLength: bytesOf(fields),
  };
}

function udpLayer(srcPort: number, dstPort: number, length: number): PacketLayer {
  const fields = [
    f("srcPort", "Source Port", "Src Port", 16, srcPort, String(srcPort), String(srcPort)),
    f("dstPort", "Destination Port", "Dst Port", 16, dstPort, `${dstPort}${dstPort === 4789 ? " (VXLAN)" : ""}`, String(dstPort), "key"),
    f("length", "Length", "Len", 16, length, String(length), String(length), "length"),
    f("checksum", "Checksum", "Cksum", 16, 0, "0x0000 (none)", "0000", "checksum"),
  ];
  return {
    id: "udp",
    kind: "udp",
    name: "UDP",
    summary: `${srcPort} → ${dstPort}`,
    color: "udp",
    fields,
    byteLength: bytesOf(fields),
  };
}

function vxlanLayer(vni: number): PacketLayer {
  const fields = [
    f("flags", "Flags", "Flags", 8, 0x08, "0x08 (I)", "08", "flag"),
    f("reserved1", "Reserved", "Rsvd", 24, 0, "0", "0"),
    f("vni", "VXLAN Network Identifier", "VNI", 24, vni, String(vni), String(vni), "key"),
    f("reserved2", "Reserved", "Rsvd", 8, 0, "0", "0"),
  ];
  return {
    id: "vxlan",
    kind: "vxlan",
    name: "VXLAN",
    subtitle: `VNI ${vni}`,
    summary: `VNI ${vni}`,
    color: "vxlan",
    fields,
    byteLength: bytesOf(fields),
  };
}

function pwControlWordLayer(pwLabel: number): PacketLayer {
  const fields = [
    f("zero", "Zero", "0000", 4, 0, "0", "0"),
    f("flags", "Flags", "Flags", 4, 0, "0", "0", "flag"),
    f("frg", "Fragmentation", "FRG", 2, 0, "0", "0"),
    f("length", "Length", "Len", 6, 0, "0", "0", "length"),
    f("seq", "Sequence Number", "Seq", 16, 1, "1", "1"),
  ];
  return {
    id: "pwcw",
    kind: "pwcw",
    name: "PW Control Word",
    subtitle: `Pseudowire ${pwLabel}`,
    summary: `Control word, seq 1`,
    color: "pw",
    fields,
    byteLength: bytesOf(fields),
  };
}

function payloadLayer(): PacketLayer {
  const bytes = new Uint8Array(PAYLOAD_BYTES);
  for (let i = 0; i < PAYLOAD_BYTES; i++) {
    bytes[i] = i < PAYLOAD_TEXT.length ? PAYLOAD_TEXT.charCodeAt(i) : 0x2e;
  }
  return {
    id: "payload",
    kind: "payload",
    name: "Payload",
    summary: `${PAYLOAD_BYTES} bytes customer data`,
    color: "payload",
    fields: [
      f("data", "Data", "Data", PAYLOAD_BYTES * 8, 0, `${PAYLOAD_BYTES} bytes`, `${PAYLOAD_BYTES} B`),
    ],
    byteLength: PAYLOAD_BYTES,
    payload: bytes,
  };
}

function sumBytes(layers: PacketLayer[]): number {
  return layers.reduce((a, l) => a + l.byteLength, 0);
}

export function buildLayers(h: PacketHeaders): PacketLayer[] {
  const mpls = h.mpls ?? [];
  const pcp = h.ip ? dscpToCodepoint(h.ip.dscp) >> 3 : 0;

  // Inner-most first so lengths can be computed, then reversed into wire order.
  const inner: PacketLayer[] = [];
  inner.push(payloadLayer());
  if (h.ip) {
    inner.push(ipv4Layer("ip", h.ip, 20 + sumBytes(inner), h.vxlan ? " (inner)" : ""));
  }

  const tunnelled = h.vxlan || h.pseudowire;
  const innerEth = h.innerEthernet ?? (tunnelled ? { ...h.ethernet! } : undefined);
  if (tunnelled && innerEth) {
    const innerType = h.ip ? 0x0800 : parseEtherType(innerEth.etherType);
    const ethLayers = ethernetLayers("eth-inner", innerEth, innerType, pcp, " (inner)");
    // ethernetLayers returns wire order; we are building inner-first, so reverse
    inner.push(...ethLayers.reverse());
  }
  if (h.pseudowire?.controlWord) {
    inner.push(pwControlWordLayer(h.pseudowire.pwLabel));
  }
  if (h.vxlan) {
    inner.push(vxlanLayer(h.vxlan.vni));
    inner.push(udpLayer(h.vxlan.outerSrcPort, h.vxlan.outerDstPort, 8 + sumBytes(inner)));
    inner.push(
      ipv4Layer(
        "ip-outer",
        {
          src: h.vxlan.outerSrcIp,
          dst: h.vxlan.outerDstIp,
          ttl: 64,
          dscp: h.ip?.dscp ?? "be",
          protocol: "UDP",
        },
        20 + sumBytes(inner),
        " (outer)"
      )
    );
  }
  // MPLS: bottom of stack is innermost
  for (let i = mpls.length - 1; i >= 0; i--) {
    inner.push(mplsLayer(mpls[i], i));
  }
  if (h.ethernet) {
    let type = parseEtherType(h.ethernet.etherType);
    if (type === 0x88a8 || type === 0x8100) {
      type = mpls.length ? 0x8847 : 0x0800;
    } else if (mpls.length && type === 0x0800) {
      type = 0x8847;
    } else if (!mpls.length && type === 0x8847) {
      type = 0x0800;
    }
    inner.push(...ethernetLayers("eth", h.ethernet, type, pcp, "").reverse());
  }
  return inner.reverse();
}
