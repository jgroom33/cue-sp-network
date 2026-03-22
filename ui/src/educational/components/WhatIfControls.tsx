import type { Topology } from "../../types";
import type { EducationalAction } from "../types";

interface Props {
  topo: Topology;
  disabledLinks: Set<string>;
  active: boolean;
  dispatch: React.Dispatch<EducationalAction>;
}

export function WhatIfControls({ topo, disabledLinks, active, dispatch }: Props) {
  // Get all core/edge links for toggles
  const links = topo.links.filter(
    (l) => l.type === "core" || l.type === "edge"
  );

  return (
    <div className="px-3 py-2 border-t border-gray-700">
      <button
        onClick={() => dispatch({ type: "TOGGLE_WHAT_IF" })}
        className={`w-full text-left text-xs font-semibold py-1.5 px-2 rounded transition-colors ${
          active
            ? "bg-red-900/30 text-red-300 border border-red-800"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`}
      >
        {active ? "✕ Close" : "⚡"} What-If Mode
        {disabledLinks.size > 0 && (
          <span className="ml-1 text-red-400">
            ({disabledLinks.size} link{disabledLinks.size > 1 ? "s" : ""} down)
          </span>
        )}
      </button>

      {active && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-[10px] text-gray-500 mb-1">
            Click a link to disable it and see how the path changes.
          </p>
          {links.map((link) => {
            const a = link.a_end.device;
            const z = link.z_end.device;
            const key = `${a}::${z}`;
            const isDisabled = disabledLinks.has(key) || disabledLinks.has(`${z}::${a}`);

            return (
              <button
                key={key}
                onClick={() => dispatch({ type: "TOGGLE_LINK", linkKey: key })}
                className={`w-full text-left text-[11px] px-2 py-1 rounded flex items-center gap-2 transition-colors ${
                  isDisabled
                    ? "bg-red-900/30 text-red-300 line-through"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDisabled ? "bg-red-500" : "bg-green-500"
                  }`}
                />
                {a}
                <span className="text-gray-600">↔</span>
                {z}
                <span className="text-gray-600 text-[10px] ml-auto">
                  {link.a_end.interface} — {link.z_end.interface}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
