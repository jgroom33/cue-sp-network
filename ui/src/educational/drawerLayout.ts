import { GRID_BITS, SIZES, type PacketSize } from "./packetSvgLayout";

/** Geometry for the side-by-side packet drawer (no DOM measurement). */

export const BADGE_W = 96;
export const PAD_X = 16; // scroller outer padding
export const COL_PAD = 16; // inner padding around each packet grid
export const CHAIN_H = 74;
export const NODE_R = 15;
export const DRAWER_HANDLE_H = 28;
export const DRAWER_DEFAULT_H = 300;
export const DRAWER_MIN_H = 200;
export const DRAWER_MAX_VH = 0.6;

/** Column width for a packet drawn at `size`: grid plus inner padding. */
export function columnWidthFor(size: PacketSize): number {
  return GRID_BITS * SIZES[size].bitW + 2 * COL_PAD;
}

export function clampDrawerHeight(h: number, viewportH: number): number {
  const max = Math.max(DRAWER_MIN_H, Math.floor(viewportH * DRAWER_MAX_VH));
  return Math.min(max, Math.max(DRAWER_MIN_H, Math.round(h)));
}

/** Total vertical space the drawer occupies (body plus handle). */
export function drawerHeight(open: boolean, bodyH: number): number {
  return open ? bodyH + DRAWER_HANDLE_H : DRAWER_HANDLE_H;
}

export interface DrawerLayoutInput {
  n: number;
  hasOrigin: boolean; // reserve a badge slot before column 0
  size: PacketSize;
  activeHop?: number;
  expandActive?: boolean; // render column `activeHop` at "full"
}

export interface DrawerLayout {
  n: number;
  hasOrigin: boolean;
  size: PacketSize;
  sizeFor(i: number): PacketSize;
  columnWidth(i: number): number;
  /** Left edge of column i. */
  columnX(i: number): number;
  columnCenterX(i: number): number;
  /** Center of the badge slot before column i (the origin slot for i = 0). */
  badgeCenterX(i: number): number;
  totalWidth: number;
  scrollTargetLeft(i: number, viewportW: number): number;
}

export function makeDrawerLayout(input: DrawerLayoutInput): DrawerLayout {
  const { n, hasOrigin, size, activeHop = -1, expandActive = false } = input;
  const sizeFor = (i: number): PacketSize => (expandActive && i === activeHop ? "full" : size);
  const widths: number[] = [];
  const lefts: number[] = [];
  let x = PAD_X + (hasOrigin ? BADGE_W : 0);
  for (let i = 0; i < n; i++) {
    const w = columnWidthFor(sizeFor(i));
    widths.push(w);
    lefts.push(x);
    x += w + BADGE_W;
  }
  const totalWidth = n <= 0 ? PAD_X * 2 : x - BADGE_W + PAD_X;
  const columnWidth = (i: number) => widths[i] ?? columnWidthFor(size);
  const columnX = (i: number) => lefts[i] ?? PAD_X + (hasOrigin ? BADGE_W : 0);
  const columnCenterX = (i: number) => columnX(i) + columnWidth(i) / 2;
  return {
    n,
    hasOrigin,
    size,
    sizeFor,
    columnWidth,
    columnX,
    columnCenterX,
    badgeCenterX: (i) => columnX(i) - BADGE_W / 2,
    totalWidth,
    scrollTargetLeft(i, viewportW) {
      const max = Math.max(0, totalWidth - viewportW);
      const target = columnCenterX(i) - viewportW / 2;
      return Math.min(Math.max(0, target), max);
    },
  };
}
