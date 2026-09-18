import type { PacketAction } from "./types";
import type { PacketLayer } from "./packetLayers";
import type { ProtocolColorKey } from "../utils/colors";

/**
 * Structured diff between consecutive hops, driven by the engine's actions so
 * that semantics (push / pop / swap) are exact even when values coincide.
 */

export type BadgeKind =
  | "push"
  | "pop"
  | "swap"
  | "ttl"
  | "dscp"
  | "encap"
  | "decap"
  | "vlan-push"
  | "vlan-pop"
  | "rewrite"
  | "info";

export type ChangeSemantic = "swap" | "ttl" | "dscp" | "rewrite" | "other";

export interface FieldChange {
  layerId: string;
  fieldId: string;
  from: string;
  fromCompact: string;
  to: string;
  fromRaw: number;
  toRaw: number;
  semantic: ChangeSemantic;
}

export interface TransitionBadge {
  id: string;
  kind: BadgeKind;
  text: string;
  color: ProtocolColorKey;
  layerId?: string;
  fieldId?: string;
}

export interface MplsOp {
  op: "push" | "pop" | "swap";
  labelId: string;
  from?: number;
  to?: number;
}

export interface PacketDiff {
  prevLayerIds: string[]; // layer order at the previous hop (for ghost placement)
  addedLayers: string[];
  removedLayers: PacketLayer[];
  changedFields: FieldChange[];
  mpls: MplsOp[];
  badges: TransitionBadge[];
}

export function emptyDiff(): PacketDiff {
  return { prevLayerIds: [], addedLayers: [], removedLayers: [], changedFields: [], mpls: [], badges: [] };
}

export function fieldKey(layerId: string, fieldId: string): string {
  return `${layerId}.${fieldId}`;
}

/** Inverse of fieldKey. Layer ids may contain dots; field ids never do. */
export function splitFieldKey(key: string): [layerId: string, fieldId: string] {
  const i = key.lastIndexOf(".");
  return i < 0 ? [key, ""] : [key.slice(0, i), key.slice(i + 1)];
}

function semanticFor(layer: PacketLayer, fieldId: string): ChangeSemantic {
  if (layer.kind === "mpls" && fieldId === "label") return "swap";
  if (fieldId === "ttl") return "ttl";
  if (fieldId === "dscp" || fieldId === "pcp" || fieldId === "tc") return "dscp";
  if (layer.kind === "ethernet") return "rewrite";
  return "other";
}

function labelOf(layer: PacketLayer): number | undefined {
  return layer.fields.find((x) => x.id === "label")?.raw;
}

export function diffPackets(
  prev: PacketLayer[] | undefined,
  next: PacketLayer[],
  actions: PacketAction[]
): PacketDiff {
  const prevMap = new Map((prev ?? []).map((l) => [l.id, l]));
  const nextMap = new Map(next.map((l) => [l.id, l]));

  const addedLayers = prev ? next.filter((l) => !prevMap.has(l.id)).map((l) => l.id) : [];
  const removedLayers = (prev ?? []).filter((l) => !nextMap.has(l.id));

  const changedFields: FieldChange[] = [];
  if (prev) {
    for (const layer of next) {
      const before = prevMap.get(layer.id);
      if (!before) continue;
      for (const field of layer.fields) {
        const bf = before.fields.find((x) => x.id === field.id);
        if (!bf) continue;
        if (bf.raw !== field.raw && field.role !== "checksum" && field.role !== "length") {
          changedFields.push({
            layerId: layer.id,
            fieldId: field.id,
            from: bf.display,
            fromCompact: bf.compact,
            to: field.display,
            fromRaw: bf.raw,
            toRaw: field.raw,
            semantic: semanticFor(layer, field.id),
          });
        }
      }
    }
  }

  const badges: TransitionBadge[] = [];
  const mpls: MplsOp[] = [];
  const touchedLayers = new Set<string>();
  const ttlChanges = changedFields.filter((c) => c.semantic === "ttl");
  const usedTtl = new Set<string>();
  let n = 0;
  const push = (b: Omit<TransitionBadge, "id">) => {
    badges.push({ id: `b${n++}`, ...b });
    if (b.layerId) touchedLayers.add(b.layerId);
  };

  const topMpls = next.find((l) => l.kind === "mpls");
  const removedMpls = removedLayers.filter((l) => l.kind === "mpls");

  for (const a of actions) {
    switch (a.type) {
      case "mpls-push": {
        const layerId = `mpls:${a.label.id}`;
        mpls.push({ op: "push", labelId: a.label.id, to: a.label.value });
        push({ kind: "push", text: `+MPLS ${a.label.value}`, color: "mpls", layerId });
        break;
      }
      case "mpls-pop":
      case "php-pop":
      case "vpn-label-pop": {
        const removed =
          removedMpls.find((l) => labelOf(l) === a.label) ?? removedMpls[0];
        const labelId = removed ? removed.id.replace(/^mpls:/, "") : "?";
        mpls.push({ op: "pop", labelId, from: a.label });
        push({
          kind: "pop",
          text: `${a.type === "php-pop" ? "PHP " : ""}−MPLS ${a.label}`,
          color: "mpls",
          layerId: removed?.id,
        });
        break;
      }
      case "mpls-swap": {
        const labelId = topMpls ? topMpls.id.replace(/^mpls:/, "") : "?";
        mpls.push({ op: "swap", labelId, from: a.from, to: a.to });
        push({
          kind: "swap",
          text: `swap ${a.from}→${a.to}`,
          color: "mpls",
          layerId: topMpls?.id,
          fieldId: "label",
        });
        break;
      }
      case "qinq-push":
        push({ kind: "vlan-push", text: `+S-VLAN ${a.svlan}`, color: "vlan", layerId: "eth.stag" });
        break;
      case "qinq-pop":
        push({ kind: "vlan-pop", text: `−S-VLAN ${a.svlan}`, color: "vlan", layerId: "eth.stag" });
        break;
      case "vxlan-encap":
        push({ kind: "encap", text: `VXLAN encap VNI ${a.vni}`, color: "vxlan", layerId: "vxlan" });
        touchedLayers.add("eth");
        break;
      case "vxlan-decap":
        push({ kind: "decap", text: "VXLAN decap", color: "vxlan", layerId: "vxlan" });
        touchedLayers.add("eth");
        break;
      case "ttl-decrement": {
        const c = ttlChanges.find(
          (x) => !usedTtl.has(fieldKey(x.layerId, x.fieldId)) && x.fromRaw === a.from && x.toRaw === a.to
        ) ?? ttlChanges.find((x) => !usedTtl.has(fieldKey(x.layerId, x.fieldId)));
        if (c) usedTtl.add(fieldKey(c.layerId, c.fieldId));
        const where = c ? (c.layerId.startsWith("mpls") ? "MPLS" : "IP") : "";
        push({
          kind: "ttl",
          text: `${where ? where + " " : ""}TTL ${a.from}→${a.to}`,
          color: c?.layerId.startsWith("mpls") ? "mpls" : "ip",
          layerId: c?.layerId,
          fieldId: c?.fieldId,
        });
        break;
      }
      default:
        break; // qos / mef / lookup / forward / cos-map stay in the inspector
    }
  }

  // Residual field changes not explained by an action. Only action badges
  // suppress residual badges, so a residual TTL tick never hides a DSCP change.
  const actionTouched = new Set(touchedLayers);
  for (const c of ttlChanges) {
    if (usedTtl.has(fieldKey(c.layerId, c.fieldId))) continue;
    const isMpls = c.layerId.startsWith("mpls");
    push({
      kind: "ttl",
      text: `${isMpls ? "MPLS" : "IP"} TTL ${c.fromRaw}→${c.toRaw}`,
      color: isMpls ? "mpls" : "ip",
      layerId: c.layerId,
      fieldId: c.fieldId,
    });
  }
  for (const c of changedFields) {
    if (c.semantic === "dscp" && c.fieldId === "dscp" && !actionTouched.has(c.layerId)) {
      push({ kind: "dscp", text: `DSCP ${c.from.split(" ")[0]}→${c.to.split(" ")[0]}`, color: "ip", layerId: c.layerId, fieldId: c.fieldId });
    }
  }
  const macChanged = changedFields.some(
    (c) => c.layerId === "eth" && (c.fieldId === "src" || c.fieldId === "dst")
  );
  const innerEthTouched =
    addedLayers.includes("eth-inner") || removedLayers.some((l) => l.id === "eth-inner");
  if (macChanged && !actionTouched.has("eth") && !innerEthTouched) {
    push({ kind: "rewrite", text: "MAC rewrite", color: "eth", layerId: "eth" });
  }
  const vidChange = changedFields.find((c) => c.layerId === "eth.stag" && c.fieldId === "vid");
  if (vidChange && !actionTouched.has("eth.stag")) {
    push({ kind: "swap", text: `S-VLAN ${vidChange.fromRaw}→${vidChange.toRaw}`, color: "vlan", layerId: "eth.stag", fieldId: "vid" });
  }

  // Dedupe by (kind, layerId, fieldId, text)
  const seen = new Set<string>();
  const deduped = badges.filter((b) => {
    const k = `${b.kind}|${b.layerId ?? ""}|${b.fieldId ?? ""}|${b.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    prevLayerIds: (prev ?? []).map((l) => l.id),
    addedLayers,
    removedLayers,
    changedFields,
    mpls,
    badges: deduped,
  };
}
