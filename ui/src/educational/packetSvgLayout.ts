import type { PacketDiff } from "./packetDiff";
import type { PacketField, PacketLayer } from "./packetLayers";

/**
 * Geometry for the RFC-style 32-bit packet grid. Pure math, no DOM
 * measurement, so it is testable and the SVG can be laid out from data alone.
 */

export interface SizeSpec {
  bitW: number; // px per bit; grid width = 32 * bitW
  rowH: number;
  font: number;
  titleH: number;
  layerGap: number;
  stripH: number;
  /** Field labels above values: never, only wide/changed cells, or every cell. */
  labels: "none" | "wide" | "all";
}

export const SIZES = {
  compact: { bitW: 6, rowH: 12, font: 7.5, titleH: 11, layerGap: 3, stripH: 13, labels: "none" },
  drawer: { bitW: 7.5, rowH: 15, font: 9.5, titleH: 14, layerGap: 4, stripH: 16, labels: "wide" },
  full: { bitW: 10.5, rowH: 26, font: 10, titleH: 16, layerGap: 6, stripH: 20, labels: "all" },
} as const satisfies Record<string, SizeSpec>;

export type PacketSize = keyof typeof SIZES;
export const SIZE_ORDER = ["compact", "drawer", "full"] as const satisfies readonly PacketSize[];
export const GRID_BITS = 32;
export const RULER_H = 12;

/** Step to the next/previous density, clamped at both ends. */
export function stepSize(size: PacketSize, dir: 1 | -1): PacketSize {
  const i = SIZE_ORDER.indexOf(size);
  const j = Math.min(SIZE_ORDER.length - 1, Math.max(0, i + dir));
  return SIZE_ORDER[j];
}

/**
 * compact: untouched layers collapse to strips, MPLS / VLAN tags always grid.
 * full:    every layer is a grid with labels.
 * diff:    only layers touched at this hop (plus their title-bearing parent).
 */
export type PacketDetail = "compact" | "full" | "diff";

export interface FieldGeom {
  key: string; // `${layerId}.${fieldId}`
  field: PacketField;
  path: string; // rect or stair-shaped polygon, relative to the layer origin
  labelX: number;
  labelY: number;
  labelW: number; // width available for the label
  rows: number; // rows spanned
  bitStart: number; // bit offset within the layer
  bitEnd: number; // exclusive
}

export interface LayerGeom {
  layer: PacketLayer;
  y: number;
  height: number;
  mode: "grid" | "strip";
  fields: FieldGeom[];
  bodyY: number; // y of first grid row / strip row, relative to layer origin
}

export interface PacketGeom {
  width: number;
  height: number;
  layers: LayerGeom[];
  ghosts: LayerGeom[]; // removed at this hop, positioned at their previous slot
}

/** Whether a layer was created or modified at this hop. */
export function isTouched(layer: PacketLayer, diff?: PacketDiff): boolean {
  if (!diff) return false;
  if (diff.addedLayers.includes(layer.id)) return true;
  return diff.changedFields.some((c) => c.layerId === layer.id);
}

/** Group each title-bearing layer with the continuation layers that follow it. */
export function layerGroups(layers: PacketLayer[]): PacketLayer[][] {
  const groups: PacketLayer[][] = [];
  for (const layer of layers) {
    if (layer.continuation && groups.length > 0) groups[groups.length - 1].push(layer);
    else groups.push([layer]);
  }
  return groups;
}

const r = (n: number) => Math.round(n * 100) / 100;

/** Stair-shaped polygon covering bits [b0, b1) on a 32-bit grid. */
export function fieldPath(b0: number, b1: number, bitW: number, rowH: number): string {
  const row0 = Math.floor(b0 / GRID_BITS);
  const rowEnd = Math.floor((b1 - 1) / GRID_BITS);
  const x0 = (b0 % GRID_BITS) * bitW;
  const xEnd = (((b1 - 1) % GRID_BITS) + 1) * bitW;
  const W = GRID_BITS * bitW;
  const y0 = row0 * rowH;
  const yEnd = rowEnd * rowH;
  if (row0 === rowEnd) {
    return `M${r(x0)},${r(y0)}H${r(xEnd)}V${r(y0 + rowH)}H${r(x0)}Z`;
  }
  return [
    `M${r(x0)},${r(y0)}`,
    `H${r(W)}`,
    `V${r(yEnd)}`,
    `H${r(xEnd)}`,
    `V${r(yEnd + rowH)}`,
    `H0`,
    `V${r(y0 + rowH)}`,
    `H${r(x0)}`,
    "Z",
  ].join("");
}

/** Best label anchor for a possibly row-spanning field. */
export function fieldLabelPos(
  b0: number,
  b1: number,
  bitW: number,
  rowH: number
): { x: number; y: number; w: number } {
  const row0 = Math.floor(b0 / GRID_BITS);
  const rowEnd = Math.floor((b1 - 1) / GRID_BITS);
  const x0 = (b0 % GRID_BITS) * bitW;
  const xEnd = (((b1 - 1) % GRID_BITS) + 1) * bitW;
  const W = GRID_BITS * bitW;
  if (row0 === rowEnd) {
    return { x: (x0 + xEnd) / 2, y: row0 * rowH + rowH / 2, w: xEnd - x0 };
  }
  if (rowEnd - row0 >= 2) {
    // a full middle row exists
    return { x: W / 2, y: (row0 + 1) * rowH + rowH / 2, w: W };
  }
  const topW = W - x0;
  const botW = xEnd;
  return topW >= botW
    ? { x: x0 + topW / 2, y: row0 * rowH + rowH / 2, w: topW }
    : { x: botW / 2, y: rowEnd * rowH + rowH / 2, w: botW };
}

export function layoutLayer(
  layer: PacketLayer,
  size: SizeSpec,
  mode: "grid" | "strip",
  y: number
): LayerGeom {
  const titleH = layer.continuation ? 0 : size.titleH;
  if (mode === "strip" || layer.kind === "payload") {
    return { layer, y, height: titleH + size.stripH, mode: "strip", fields: [], bodyY: titleH };
  }
  const fields: FieldGeom[] = [];
  let bit = 0;
  for (const field of layer.fields) {
    const b1 = bit + field.bits;
    const pos = fieldLabelPos(bit, b1, size.bitW, size.rowH);
    fields.push({
      key: `${layer.id}.${field.id}`,
      field,
      path: fieldPath(bit, b1, size.bitW, size.rowH),
      labelX: pos.x,
      labelY: pos.y,
      labelW: pos.w,
      rows: Math.floor((b1 - 1) / GRID_BITS) - Math.floor(bit / GRID_BITS) + 1,
      bitStart: bit,
      bitEnd: b1,
    });
    bit = b1;
  }
  const rows = Math.ceil(bit / GRID_BITS);
  return { layer, y, height: titleH + rows * size.rowH, mode: "grid", fields, bodyY: titleH };
}

export interface LayoutOptions {
  detail: PacketDetail;
  ruler?: boolean;
}

export function layoutPacket(
  layers: PacketLayer[],
  diff: PacketDiff | undefined,
  sizeKey: PacketSize,
  opts: LayoutOptions
): PacketGeom {
  const size = SIZES[sizeKey];
  const width = GRID_BITS * size.bitW;
  // The first hop has nothing to diff against; show it as the compact baseline.
  const baseline = !diff || diff.prevLayerIds.length === 0;
  const detail: PacketDetail = opts.detail === "diff" && baseline ? "compact" : opts.detail;
  const visible =
    detail === "diff"
      ? layerGroups(layers).filter((g) => g.some((l) => isTouched(l, diff))).flat()
      : layers;

  let y = opts.ruler ? RULER_H : 0;
  const out: LayerGeom[] = [];
  for (const layer of visible) {
    const grid =
      detail === "full" ||
      (detail === "compact" &&
        (layer.kind === "mpls" || layer.kind === "stag" || layer.kind === "ctag")) ||
      isTouched(layer, diff);
    if (!layer.continuation && out.length > 0) y += size.layerGap;
    const g = layoutLayer(layer, size, grid ? "grid" : "strip", y);
    out.push(g);
    y += g.height;
  }

  // Ghosts: removed layers sit where their next surviving neighbour now sits
  const ghosts: LayerGeom[] = [];
  if (diff && diff.removedLayers.length) {
    const yOf = new Map(out.map((g) => [g.layer.id, g.y]));
    for (const removed of diff.removedLayers) {
      const idx = diff.prevLayerIds.indexOf(removed.id);
      let gy = y;
      for (let i = idx + 1; i < diff.prevLayerIds.length; i++) {
        const ny = yOf.get(diff.prevLayerIds[i]);
        if (ny !== undefined) {
          gy = ny;
          break;
        }
      }
      const g = layoutLayer(removed, size, detail === "compact" ? "strip" : "grid", gy);
      ghosts.push(g);
    }
  }

  return { width, height: y, layers: out, ghosts };
}

/** Whether a grid cell shows its short field name above the value. */
export function showFieldLabel(
  field: Pick<PacketField, "bits">,
  changed: boolean,
  detail: PacketDetail,
  size: SizeSpec
): boolean {
  if (detail === "full" || size.labels === "all") return true;
  return size.labels === "wide" && (field.bits >= 16 || changed);
}

const LABEL_DY = 0.26;
const VALUE_DY = 0.2;

/** Vertical anchors for a one-line value or a label/value pair centred on `labelY`. */
export function fieldTextY(
  labelY: number,
  size: SizeSpec,
  twoLine: boolean
): { labelY: number; valueY: number } {
  if (!twoLine) return { labelY, valueY: labelY };
  return { labelY: labelY - size.rowH * LABEL_DY, valueY: labelY + size.rowH * VALUE_DY };
}

export type TextKind = "mac" | "ip" | "generic";

/** Fit text to a pixel width using a monospace estimate (0.6em per char). */
export function fitText(text: string, widthPx: number, fontPx: number, kind: TextKind = "generic"): string {
  const maxChars = Math.floor(widthPx / (fontPx * 0.6));
  if (text.length <= maxChars) return text;
  if (maxChars <= 1) return "";
  if (kind === "mac") return "…" + text.slice(-(maxChars - 1));
  if (kind === "ip") return text.slice(0, maxChars - 1) + "…";
  const head = Math.ceil((maxChars - 1) / 2);
  const tail = maxChars - 1 - head;
  return text.slice(0, head) + "…" + (tail > 0 ? text.slice(-tail) : "");
}
