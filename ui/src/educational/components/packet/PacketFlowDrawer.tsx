import { Fragment, useCallback, useRef } from "react";
import type { DeviceRole } from "../../../types";
import type { AnimationClock } from "../../animationClock";
import type { HopModel } from "../../packetModels";
import type { ComputedScenario, EducationalAction } from "../../types";
import {
  COLUMN_W,
  DRAWER_OPEN_H,
  PAD_X,
  scrollTargetLeft,
  totalWidth,
} from "../../drawerLayout";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { NodeChain } from "./NodeChain";
import { PacketSvg } from "./PacketSvg";
import { TransitionBadges } from "./TransitionBadges";

interface Props {
  scenario: ComputedScenario;
  models: HopModel[];
  deviceRoles: Record<string, DeviceRole>;
  currentHop: number;
  speed: number;
  open: boolean;
  clock: AnimationClock;
  dispatch: React.Dispatch<EducationalAction>;
}

/** Glass drawer over the topology: node chain + one packet per hop, side by side. */
export function PacketFlowDrawer({
  scenario,
  models,
  deviceRoles,
  currentHop,
  speed,
  open,
  clock,
  dispatch,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = models.length;
  const hasOrigin = (models[0]?.diff.badges.length ?? 0) > 0;
  const width = totalWidth(n, hasOrigin);

  const target = useCallback(
    (viewportW: number) => scrollTargetLeft(currentHop, viewportW, n, hasOrigin),
    [currentHop, n, hasOrigin]
  );
  const { following, follow } = useAutoScroll(scrollerRef, currentHop, target, open);

  const selectHop = useCallback((hop: number) => dispatch({ type: "SET_HOP", hop }), [dispatch]);

  return (
    <div
      className="pkt-drawer absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-gray-950/75 backdrop-blur-md shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.8)]"
      style={{
        translate: open ? "0 0" : `0 ${DRAWER_OPEN_H}px`,
        "--pkt-dur": `${Math.max(120, 350 / speed)}ms`,
      } as React.CSSProperties}
    >
      {/* Handle */}
      <div
        className="h-7 flex items-center gap-3 px-3 text-[11px] select-none cursor-pointer hover:bg-white/5"
        onClick={() => dispatch({ type: "TOGGLE_DRAWER" })}
        title="Toggle packet drawer (d)"
      >
        <span className="text-gray-500">{open ? "▾" : "▴"}</span>
        <span className="font-semibold text-gray-200">Packet flow</span>
        <span className="text-gray-500">{scenario.definition.shortName}</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400 font-mono">Hop {currentHop + 1}/{n}</span>
        <span className="flex-1" />
        {open && !following && (
          <button
            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-800/50"
            onClick={(e) => {
              e.stopPropagation();
              follow();
            }}
          >
            Follow ⟳
          </button>
        )}
        <span className="text-[9px] text-gray-600">d</span>
      </div>

      {/* Body */}
      <div ref={scrollerRef} className="overflow-auto" style={{ height: DRAWER_OPEN_H }}>
        <div style={{ width }}>
          <NodeChain
            states={scenario.packetStates}
            deviceRoles={deviceRoles}
            currentHop={currentHop}
            hasOrigin={hasOrigin}
            clock={clock}
            onSelectHop={selectHop}
          />
          <div className="flex items-start pb-3" style={{ paddingLeft: PAD_X, paddingRight: PAD_X }}>
            {hasOrigin && (
              <TransitionBadges badges={models[0].diff.badges} active={currentHop === 0} past={currentHop > 0} origin />
            )}
            {models.map((m, i) => {
              const isActive = i === currentHop;
              return (
                <Fragment key={i}>
                  {i > 0 && (
                    <TransitionBadges badges={m.diff.badges} active={isActive} past={i < currentHop} />
                  )}
                  <div
                    className={`pkt-col shrink-0 rounded-md cursor-pointer ${
                      isActive ? "opacity-100 bg-white/[0.04] ring-1 ring-white/15" : "opacity-45 hover:opacity-80"
                    }`}
                    style={{ width: COLUMN_W, padding: `6px ${(COLUMN_W - 192) / 2}px` }}
                    data-active={isActive || undefined}
                    onClick={() => selectHop(i)}
                  >
                    <PacketSvg layers={m.layers} diff={m.diff} size="compact" detail="compact" active={isActive} hopKey={i} />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
