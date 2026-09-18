import type { ProtocolColorKey } from "../utils/colors";
import type { PacketField, PacketLayer } from "./packetLayers";

/** Wire serialization of packet layers, IPv4 checksum, and hex-dump rows. */

export interface ByteOwner {
  layerId: string;
  fieldId: string;
  color: ProtocolColorKey;
}

export interface SerializedPacket {
  bytes: Uint8Array;
  owners: ByteOwner[]; // one per byte
  layerRanges: Map<string, [start: number, end: number]>; // end exclusive
}

export interface HexCell {
  offset: number;
  hex: string;
  ascii: string;
  owner: ByteOwner;
}

export interface HexRow {
  offset: number;
  cells: HexCell[];
}

/** Pack a flat MSB-first bit sequence into bytes. Throws unless bits % 8 === 0. */
export function packFields(fields: Pick<PacketField, "bits" | "raw">[]): Uint8Array {
  let totalBits = 0;
  let acc = 0n;
  for (const f of fields) {
    if (f.bits <= 0) throw new Error("field bits must be > 0");
    const max = (1n << BigInt(f.bits)) - 1n;
    const v = BigInt(Math.max(0, Math.floor(f.raw))) & max;
    acc = (acc << BigInt(f.bits)) | v;
    totalBits += f.bits;
  }
  if (totalBits % 8 !== 0) {
    throw new Error(`field bits (${totalBits}) not byte aligned`);
  }
  const n = totalBits / 8;
  const out = new Uint8Array(n);
  for (let i = n - 1; i >= 0; i--) {
    out[i] = Number(acc & 0xffn);
    acc >>= 8n;
  }
  return out;
}

/** One's-complement checksum over 16-bit words (RFC 1071); pads odd length. */
export function ipv4Checksum(header: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < header.length; i += 2) {
    const hi = header[i];
    const lo = i + 1 < header.length ? header[i + 1] : 0;
    sum += (hi << 8) | lo;
  }
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return ~sum & 0xffff;
}

export function macToNumber(mac: string): number {
  const parts = mac.split(":");
  if (parts.length !== 6) return 0;
  let n = 0;
  for (const p of parts) {
    const b = parseInt(p, 16);
    n = n * 256 + (Number.isFinite(b) ? b & 0xff : 0);
  }
  return n;
}

export function numberToMac(n: number): string {
  const out: string[] = [];
  let v = n;
  for (let i = 0; i < 6; i++) {
    out.unshift((v % 256).toString(16).padStart(2, "0"));
    v = Math.floor(v / 256);
  }
  return out.join(":");
}

export function ipv4ToNumber(ip: string): number {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p))) return 0;
  return parts.reduce((acc, p) => acc * 256 + (p & 0xff), 0);
}

export function numberToIpv4(n: number): string {
  return [24, 16, 8, 0].map((s) => (Math.floor(n / 2 ** s) & 0xff).toString()).join(".");
}

export function serializePacket(layers: PacketLayer[]): SerializedPacket {
  const chunks: Uint8Array[] = [];
  const owners: ByteOwner[] = [];
  const layerRanges = new Map<string, [number, number]>();
  let offset = 0;

  for (const layer of layers) {
    let bytes: Uint8Array;
    if (layer.payload) {
      bytes = layer.payload;
      for (let i = 0; i < bytes.length; i++) {
        owners.push({ layerId: layer.id, fieldId: "data", color: layer.color });
      }
    } else {
      bytes = packFields(layer.fields);
      // Attribute each byte to the field that owns its first bit
      let bit = 0;
      let fi = 0;
      let fieldEndBit = layer.fields[0]?.bits ?? 0;
      for (let i = 0; i < bytes.length; i++) {
        while (bit >= fieldEndBit && fi < layer.fields.length - 1) {
          fi++;
          fieldEndBit += layer.fields[fi].bits;
        }
        owners.push({
          layerId: layer.id,
          fieldId: layer.fields[fi]?.id ?? "?",
          color: layer.color,
        });
        bit += 8;
      }
    }
    chunks.push(bytes);
    layerRanges.set(layer.id, [offset, offset + bytes.length]);
    offset += bytes.length;
  }

  const out = new Uint8Array(offset);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return { bytes: out, owners, layerRanges };
}

export function toHexRows(pkt: SerializedPacket, perRow = 16): HexRow[] {
  const rows: HexRow[] = [];
  for (let start = 0; start < pkt.bytes.length; start += perRow) {
    const cells: HexCell[] = [];
    for (let i = start; i < Math.min(start + perRow, pkt.bytes.length); i++) {
      const b = pkt.bytes[i];
      cells.push({
        offset: i,
        hex: b.toString(16).padStart(2, "0"),
        ascii: b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".",
        owner: pkt.owners[i],
      });
    }
    rows.push({ offset: start, cells });
  }
  return rows;
}
