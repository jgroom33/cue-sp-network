import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { protocolColors } from "../../../utils/colors";
import { describeField } from "../../packetFieldInfo";
import type { HopModel } from "../../packetModels";
import { placeTooltip } from "../../tooltipLayout";
import { usePacketHover } from "./PacketHoverContext";

const hex = (n: number) => "0x" + n.toString(16).padStart(4, "0");

/** Styled tooltip for the hovered packet field; one instance serves every packet view. */
export function FieldTooltip({ models }: { models: HopModel[] | null }) {
  const { hover } = usePacketHover();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const anchor = hover?.anchor;
  const info = useMemo(
    () => (hover && models?.[hover.hop] ? describeField(models[hover.hop], hover.key) : undefined),
    [hover, models]
  );

  useLayoutEffect(() => {
    if (!info || !anchor || !ref.current) {
      setPos(null);
      return;
    }
    const r = ref.current.getBoundingClientRect();
    const p = placeTooltip(anchor, { w: r.width, h: r.height }, { w: window.innerWidth, h: window.innerHeight });
    setPos({ left: p.left, top: p.top });
  }, [info, anchor]);

  if (!hover || !info || !anchor) return null;
  const color = protocolColors[info.color];
  const span = info.byteEnd - info.byteStart;

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-40 pointer-events-none max-w-[300px] rounded-md border border-white/15 bg-gray-900/95 px-2.5 py-2 font-mono text-[11px] leading-snug text-gray-200 shadow-xl"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px]">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-gray-400">{info.layerName}</span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-500">hop {hover.hop + 1}</span>
      </div>
      <div className="font-semibold text-white">{info.name}</div>
      <div className="break-all text-amber-200">{info.display}</div>
      {info.prev !== undefined && <div className="text-red-300">was {info.prev}</div>}
      {info.added && <div className="text-emerald-300">added at this hop</div>}
      <div className="mt-1 text-[10px] text-gray-500">
        {info.bits} bit{info.bits === 1 ? "" : "s"} · bits {info.bitStart}–{info.bitStart + info.bits - 1} · offset{" "}
        {hex(info.byteStart)}
        {span > 1 ? ` (${info.byteStart}–${info.byteEnd - 1})` : ` (${info.byteStart})`}
      </div>
    </div>,
    document.body
  );
}
