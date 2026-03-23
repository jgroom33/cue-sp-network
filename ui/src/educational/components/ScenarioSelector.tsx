import type { ScenarioDefinition } from "../types";
import { scenarios } from "../scenarios";

interface Props {
  onSelect: (scenario: ScenarioDefinition) => void;
}

const categoryColors: Record<string, string> = {
  l3vpn: "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20",
  l2vpn: "border-teal-500 bg-teal-500/10 hover:bg-teal-500/20",
  vxlan: "border-violet-500 bg-violet-500/10 hover:bg-violet-500/20",
  "sr-te": "border-pink-500 bg-pink-500/10 hover:bg-pink-500/20",
  bgp: "border-amber-500 bg-amber-500/10 hover:bg-amber-500/20",
  tilfa: "border-red-500 bg-red-500/10 hover:bg-red-500/20",
  internet: "border-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20",
};

export function ScenarioSelector({ onSelect }: Props) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-white mb-1">
        Educational Mode
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        Select a scenario to visualize packet flow through the network.
        Watch headers change at each hop with animated forwarding.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`text-left p-3 rounded-lg border ${
              categoryColors[s.category] ?? "border-gray-600 bg-gray-800"
            } transition-all cursor-pointer`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className="font-semibold text-white text-sm">
                {s.name}
              </span>
            </div>
            <p className="text-xs text-gray-300 mb-2 line-clamp-2">
              {s.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {s.concepts.slice(0, 3).map((c) => (
                <span
                  key={c}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-300"
                >
                  {c}
                </span>
              ))}
              {s.concepts.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-gray-500">
                  +{s.concepts.length - 3} more
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
