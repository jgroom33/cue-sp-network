import { useCallback, useEffect, useState } from "react";
import type { Topology, Device } from "../../types";
import type { EducationalState, EducationalAction, ScenarioDefinition } from "../types";
import { computeScenario } from "../packetEngine";
import { ScenarioSelector } from "./ScenarioSelector";
import { HopTimeline } from "./HopTimeline";
import { AnimationControls } from "./AnimationControls";
import { PacketInspector } from "./PacketInspector";
import { PacketView } from "./packet/PacketView";
import type { HopModel } from "../packetModels";
import { QoSPipelineView } from "./QoSPipelineView";
import { WhatIfControls } from "./WhatIfControls";
import { KeyboardHelp } from "./KeyboardHelp";

interface Props {
  topo: Topology;
  configs: Record<string, Device>;
  state: EducationalState;
  models: HopModel[] | null;
  dispatch: React.Dispatch<EducationalAction>;
}

export function EducationalPanel({ topo, configs, state, models, dispatch }: Props) {
  const { activeScenario, animation, whatIf, showQoS } = state;
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const handleSelectScenario = useCallback(
    (scenarioDef: ScenarioDefinition) => {
      const computed = computeScenario(scenarioDef, topo, configs, whatIf.disabledLinks);
      dispatch({ type: "SET_SCENARIO", scenario: computed });
    },
    [topo, configs, whatIf.disabledLinks, dispatch]
  );

  // Recompute scenario when what-if links change
  useEffect(() => {
    if (activeScenario && whatIf.disabledLinks.size >= 0) {
      const recomputed = computeScenario(
        activeScenario.definition,
        topo,
        configs,
        whatIf.disabledLinks
      );
      if (recomputed) {
        // Only update if path actually changed
        const oldPath = activeScenario.path.join(",");
        const newPath = recomputed.path.join(",");
        if (oldPath !== newPath) {
          dispatch({ type: "SET_SCENARIO", scenario: recomputed });
        }
      }
    }
  }, [whatIf.disabledLinks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    if (!activeScenario) return;

    const handleKey = (e: KeyboardEvent) => {
      // Don't capture if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          dispatch({ type: animation.playing ? "PAUSE" : "PLAY" });
          break;
        case "ArrowRight":
          e.preventDefault();
          dispatch({ type: "STEP_FORWARD" });
          break;
        case "ArrowLeft":
          e.preventDefault();
          dispatch({ type: "STEP_BACKWARD" });
          break;
        case "+":
        case "=":
          e.preventDefault();
          {
            const speeds = [0.5, 1, 2, 4] as const;
            const idx = speeds.indexOf(animation.speed);
            if (idx < speeds.length - 1)
              dispatch({ type: "SET_SPEED", speed: speeds[idx + 1] });
          }
          break;
        case "-":
          e.preventDefault();
          {
            const speeds = [0.5, 1, 2, 4] as const;
            const idx = speeds.indexOf(animation.speed);
            if (idx > 0)
              dispatch({ type: "SET_SPEED", speed: speeds[idx - 1] });
          }
          break;
        case "Home":
          e.preventDefault();
          dispatch({ type: "SET_HOP", hop: 0 });
          break;
        case "End":
          e.preventDefault();
          dispatch({ type: "SET_HOP", hop: activeScenario.packetStates.length - 1 });
          break;
        case "d":
        case "D":
          dispatch({ type: "TOGGLE_DRAWER" });
          break;
        case "b":
        case "B":
          dispatch({ type: "TOGGLE_BYTES" });
          break;
        case "Escape":
          if (showHelp) {
            setShowHelp(false);
          } else {
            dispatch({ type: "SET_SCENARIO", scenario: null });
          }
          break;
        case "?":
          setShowHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeScenario, animation.playing, animation.speed, dispatch, showHelp]);

  // No scenario selected — show selector
  if (!activeScenario) {
    return (
      <div className="w-96 h-full bg-gray-900 border-l border-gray-700 overflow-y-auto">
        <ScenarioSelector onSelect={handleSelectScenario} />
      </div>
    );
  }

  const currentState = activeScenario.packetStates[animation.currentHop];

  const maxHop = activeScenario.packetStates.length - 1;

  // Get device config for current hop (for QoS view)
  const currentDeviceKey = currentState?.device.replace(/-/g, "_");
  const currentConfig = configs[currentDeviceKey] ?? configs[currentState?.device];

  return (
    <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50 flex items-center gap-2">
        <button
          onClick={() => dispatch({ type: "SET_SCENARIO", scenario: null })}
          className="text-gray-400 hover:text-white text-sm transition-colors"
          title="Back to scenarios"
        >
          ←
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{activeScenario.definition.icon}</span>
            <span className="text-sm font-bold text-white">
              {activeScenario.definition.shortName}
            </span>
          </div>
          <div className="text-[10px] text-gray-500">
            {activeScenario.path.join(" → ")}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => dispatch({ type: "TOGGLE_QOS" })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              showQoS
                ? "bg-green-900/40 text-green-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            QoS
          </button>
          <button
            onClick={() => dispatch({ type: "TOGGLE_OVERLAY" })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              state.showOverlay
                ? "bg-blue-900/40 text-blue-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Overlay
          </button>
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="text-[10px] px-1.5 py-0.5 rounded transition-colors text-gray-500 hover:text-gray-300"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>
      </div>

      {/* Hop Timeline */}
      <HopTimeline
        packetStates={activeScenario.packetStates}
        currentHop={animation.currentHop}
        deviceRoles={topo.device_roles}
        dispatch={dispatch}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {currentState && (
          <>
            {/* Packet Inspector (actions + annotation) */}
            <PacketInspector state={currentState} />

            {/* Packet (RFC grid + optional bytes) */}
            {models?.[animation.currentHop] && (
              <PacketView
                model={models[animation.currentHop]}
                hop={animation.currentHop}
                showBytes={state.showBytes}
                speed={animation.speed}
                onToggleBytes={() => dispatch({ type: "TOGGLE_BYTES" })}
              />
            )}

            {/* QoS Pipeline (togglable) */}
            {showQoS && (
              <div className="border-b border-gray-700">
                <QoSPipelineView state={currentState} config={currentConfig} />
              </div>
            )}
          </>
        )}

        {/* What-If Controls */}
        <WhatIfControls
          topo={topo}
          disabledLinks={whatIf.disabledLinks}
          active={whatIf.active}
          dispatch={dispatch}
        />
      </div>

      {/* Animation Controls (pinned at bottom) */}
      <AnimationControls
        animation={animation}
        maxHop={maxHop}
        dispatch={dispatch}
      />

      {/* Keyboard shortcut hints */}
      <div className="px-3 py-1 border-t border-gray-800 bg-gray-900 text-[9px] text-gray-600 flex justify-center gap-3">
        <span>Space: play/pause</span>
        <span>←→: step</span>
        <span>+−: speed</span>
        <span>d: drawer</span>
        <span>b: bytes</span>
        <span>Esc: back</span>
        <span>?: help</span>
      </div>

      {/* Keyboard shortcut help modal */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
