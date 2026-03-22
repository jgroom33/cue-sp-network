import type { PacketState, EducationalAction } from "../types";

interface Props {
  packetStates: PacketState[];
  currentHop: number;
  dispatch: React.Dispatch<EducationalAction>;
}

const roleColors: Record<string, string> = {
  CE: "#22c55e",
  PE: "#3b82f6",
  P: "#6b7280",
  RR: "#a855f7",
  ASBR: "#ef4444",
  AGG: "#f97316",
  EXTERNAL: "#ec4899",
};

export function HopTimeline({
  packetStates,
  currentHop,
  dispatch,
}: Props) {
  return (
    <div className="px-3 py-2 border-b border-gray-700">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {packetStates.map((state, i) => {
          const isActive = i === currentHop;
          const isPast = i < currentHop;
          const color = roleColors[getDeviceRole(state.device)] ?? "#6b7280";

          return (
            <div key={i} className="flex items-center shrink-0">
              <button
                onClick={() => dispatch({ type: "SET_HOP", hop: i })}
                className={`
                  relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all cursor-pointer
                  ${isActive ? "bg-gray-700 ring-1 ring-blue-500" : "hover:bg-gray-800"}
                `}
                title={`Hop ${i + 1}: ${state.device}`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                    isActive
                      ? "ring-2 ring-blue-400 scale-110"
                      : isPast
                        ? "opacity-60"
                        : "opacity-40"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {state.device.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`text-[9px] ${
                    isActive ? "text-white font-semibold" : "text-gray-500"
                  }`}
                >
                  {state.device}
                </span>
              </button>
              {i < packetStates.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${
                    isPast ? "bg-blue-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDeviceRole(device: string): string {
  if (device.startsWith("ce")) return "CE";
  if (device.startsWith("pe")) return "PE";
  if (device.startsWith("p") && !device.startsWith("pc")) return "P";
  if (device.startsWith("rr")) return "RR";
  if (device.startsWith("asbr")) return "ASBR";
  if (device.startsWith("agg")) return "AGG";
  if (device.startsWith("isp")) return "EXTERNAL";
  return "P";
}
