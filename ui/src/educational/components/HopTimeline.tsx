import type { PacketState, EducationalAction } from "../types";
import type { DeviceRole } from "../../types";
import { roleColors } from "../../utils/colors";
import { getDeviceRole, roleAbbrev } from "../../utils/roles";

interface Props {
  packetStates: PacketState[];
  currentHop: number;
  deviceRoles: Record<string, DeviceRole>;
  dispatch: React.Dispatch<EducationalAction>;
}

export function HopTimeline({
  packetStates,
  currentHop,
  deviceRoles,
  dispatch,
}: Props) {
  return (
    <div className="px-3 py-2 border-b border-gray-700">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {packetStates.map((state, i) => {
          const isActive = i === currentHop;
          const isPast = i < currentHop;
          const role = getDeviceRole(state.device, deviceRoles);
          const color = roleColors[role];

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
                  {roleAbbrev[role]}
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
