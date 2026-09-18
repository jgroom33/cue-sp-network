/** Pure placement for a tooltip anchored to a hovered cell. */

export interface HoverAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipPlacement {
  left: number;
  top: number;
  placement: "above" | "below";
}

const EDGE = 4;

/** Prefer above the anchor; flip below when it would leave the viewport; clamp horizontally. */
export function placeTooltip(
  anchor: HoverAnchor,
  tip: { w: number; h: number },
  vp: { w: number; h: number },
  gap = 8
): TooltipPlacement {
  let top = anchor.top - gap - tip.h;
  let placement: TooltipPlacement["placement"] = "above";
  if (top < EDGE) {
    top = anchor.top + anchor.height + gap;
    placement = "below";
  }
  const maxLeft = Math.max(EDGE, vp.w - tip.w - EDGE);
  const left = Math.min(maxLeft, Math.max(EDGE, anchor.left + anchor.width / 2 - tip.w / 2));
  return { left, top, placement };
}
