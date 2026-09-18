/** Fixed geometry for the side-by-side packet drawer (no DOM measurement). */

export const COLUMN_W = 224;
export const BADGE_W = 96;
export const PAD_X = 16;
export const CHAIN_H = 74;
export const NODE_R = 15;
export const DRAWER_OPEN_H = 300;
export const DRAWER_HANDLE_H = 28;

export function drawerHeight(open: boolean): number {
  return open ? DRAWER_OPEN_H + DRAWER_HANDLE_H : DRAWER_HANDLE_H;
}

/** Left edge of column i. `hasOrigin` reserves a badge slot before column 0. */
export function columnX(i: number, hasOrigin: boolean): number {
  return PAD_X + (hasOrigin ? BADGE_W : 0) + i * (COLUMN_W + BADGE_W);
}

export function columnCenterX(i: number, hasOrigin: boolean): number {
  return columnX(i, hasOrigin) + COLUMN_W / 2;
}

/** Center of the badge slot between column i-1 and i (i >= 1), or the origin slot for i = 0. */
export function badgeCenterX(i: number, hasOrigin: boolean): number {
  return columnX(i, hasOrigin) - BADGE_W / 2;
}

export function totalWidth(n: number, hasOrigin: boolean): number {
  if (n <= 0) return PAD_X * 2;
  return PAD_X * 2 + (hasOrigin ? BADGE_W : 0) + n * COLUMN_W + (n - 1) * BADGE_W;
}

export function scrollTargetLeft(
  i: number,
  viewportW: number,
  n: number,
  hasOrigin: boolean
): number {
  const max = Math.max(0, totalWidth(n, hasOrigin) - viewportW);
  const target = columnCenterX(i, hasOrigin) - viewportW / 2;
  return Math.min(Math.max(0, target), max);
}
