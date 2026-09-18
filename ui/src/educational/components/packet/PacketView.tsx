import { useState } from "react";
import type { HopModel } from "../../packetModels";
import { PacketSvg } from "./PacketSvg";
import { HexPane } from "./HexPane";
import { protocolColors } from "../../../utils/colors";

interface Props {
  model: HopModel;
  hop: number;
  showBytes: boolean;
  speed: number;
  onToggleBytes: () => void;
}

/** Right-panel packet: full RFC grid for the active hop plus optional bytes pane. */
export function PacketView({ model, hop, showBytes, speed, onToggleBytes }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = model.bytes.bytes.length;
  const legend = Array.from(new Set(model.layers.map((l) => l.color)));

  return (
    <div
      className="px-3 py-2 border-b border-gray-700"
      data-active=""
      style={{ "--pkt-dur": `${Math.max(120, 350 / speed)}ms` } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Packet · {total} bytes on wire
        </h4>
        <button
          onClick={onToggleBytes}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
            showBytes ? "bg-amber-900/40 text-amber-300" : "text-gray-500 hover:text-gray-300"
          }`}
          title="Toggle hex bytes (b)"
        >
          Bytes
        </button>
      </div>
      <div className="overflow-x-auto">
        <PacketSvg
          layers={model.layers}
          diff={model.diff}
          size="full"
          detail="full"
          active
          ruler
          hopKey={hop}
          hoveredField={hovered}
          onHoverField={setHovered}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-gray-500">
        {legend.map((c) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: protocolColors[c] }} />
            {c === "eth" ? "Ethernet" : c === "ip" ? "IPv4" : c.toUpperCase()}
          </span>
        ))}
      </div>
      {showBytes && (
        <div className="mt-2 pt-2 border-t border-gray-800 overflow-x-auto">
          <HexPane bytes={model.bytes} diff={model.diff} hoveredField={hovered} onHoverField={setHovered} />
        </div>
      )}
    </div>
  );
}
