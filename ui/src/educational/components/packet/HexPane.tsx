import { useMemo } from "react";
import { protocolColors } from "../../../utils/colors";
import type { SerializedPacket } from "../../packetBytes";
import { toHexRows } from "../../packetBytes";
import type { PacketDiff } from "../../packetDiff";
import { fieldKey } from "../../packetDiff";

interface Props {
  bytes: SerializedPacket;
  diff?: PacketDiff;
  dense?: boolean;
  hoveredField?: string | null;
  onHoverField?: (key: string | null) => void;
}

/** Wireshark-style bytes pane: offset, hex, ASCII; bytes colored by layer. */
export function HexPane({ bytes, diff, dense = false, hoveredField, onHoverField }: Props) {
  const perRow = dense ? 8 : 16;
  const rows = useMemo(() => toHexRows(bytes, perRow), [bytes, perRow]);
  const changed = useMemo(() => {
    const s = new Set<string>();
    diff?.changedFields.forEach((c) => s.add(fieldKey(c.layerId, c.fieldId)));
    return s;
  }, [diff]);
  const addedLayers = useMemo(() => new Set(diff?.addedLayers ?? []), [diff]);

  return (
    <div className={`font-mono leading-[1.35] select-text ${dense ? "text-[9px]" : "text-[10.5px]"}`}
         onMouseLeave={onHoverField ? () => onHoverField(null) : undefined}>
      {rows.map((row) => (
        <div key={row.offset} className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-gray-600 w-9 shrink-0 text-right">{row.offset.toString(16).padStart(4, "0")}</span>
          <span className="flex gap-[3px]">
            {row.cells.map((c) => {
              const key = fieldKey(c.owner.layerId, c.owner.fieldId);
              const isChanged = changed.has(key) || addedLayers.has(c.owner.layerId);
              const isHover = hoveredField === key;
              const color = protocolColors[c.owner.color];
              return (
                <span
                  key={c.offset}
                  className={`px-[1px] rounded-[2px] ${isChanged ? "font-bold" : ""} ${
                    isHover ? "ring-1 ring-white/80" : isChanged ? "ring-1 ring-amber-400/70" : ""
                  }`}
                  style={{
                    color,
                    backgroundColor: isHover ? `${color}55` : isChanged ? `${color}30` : `${color}14`,
                  }}
                  onMouseEnter={onHoverField ? () => onHoverField(key) : undefined}
                  title={`0x${c.offset.toString(16).padStart(4, "0")} · ${c.owner.layerId}.${c.owner.fieldId}`}
                >
                  {c.hex}
                </span>
              );
            })}
          </span>
          {!dense && (
            <span className="text-gray-500 ml-1 tracking-tight">
              {row.cells.map((c) => c.ascii).join("")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
