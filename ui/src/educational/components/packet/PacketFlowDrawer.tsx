import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DeviceRole } from "../../../types";
import type { AnimationClock } from "../../animationClock";
import type { HopModel } from "../../packetModels";
import type { ComputedScenario, EducationalAction } from "../../types";
import {
  COL_PAD,
  DRAWER_DEFAULT_H,
  PAD_X,
  clampDrawerHeight,
  makeDrawerLayout,
} from "../../drawerLayout";
import { SIZE_ORDER, type PacketDetail, type PacketSize } from "../../packetSvgLayout";
import type { HoverAnchor } from "../../tooltipLayout";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import { HexPane } from "./HexPane";
import { NodeChain } from "./NodeChain";
import { usePacketHover } from "./PacketHoverContext";
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
  size: PacketSize;
  bodyHeight: number;
  showBytes: boolean;
  expandActive: boolean;
  diffOnly: boolean;
}

const SIZE_LABELS: Record<PacketSize, [short: string, long: string]> = {
  compact: ["S", "Small"],
  drawer: ["M", "Medium"],
  full: ["L", "Large"],
};

const DRAG_THRESHOLD = 4;
const WHEEL_STEP = 40;

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
  size,
  bodyHeight,
  showBytes,
  expandActive,
  diffOnly,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const n = models.length;
  const hasOrigin = (models[0]?.diff.badges.length ?? 0) > 0;
  const layout = useMemo(
    () => makeDrawerLayout({ n, hasOrigin, size, activeHop: currentHop, expandActive }),
    [n, hasOrigin, size, currentHop, expandActive]
  );

  const target = useCallback(
    (viewportW: number) => layout.scrollTargetLeft(currentHop, viewportW),
    [layout, currentHop]
  );
  const { following, follow } = useAutoScroll(scrollerRef, currentHop, target, open);

  const selectHop = useCallback((hop: number) => dispatch({ type: "SET_HOP", hop }), [dispatch]);

  // ── Cross-hop hover ────────────────────────────────────────────────────
  const { hover, setHover } = usePacketHover();
  const onHover = useMemo(
    () =>
      models.map(
        (_, i) => (key: string | null, anchor?: HoverAnchor) => setHover(key ? { key, hop: i, anchor } : null)
      ),
    [models, setHover]
  );
  // Anchors go stale when the drawer moves; drop the tooltip rather than misplace it.
  useEffect(() => {
    setHover(null);
  }, [currentHop, open, size, expandActive, diffOnly, setHover]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setHover(null);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [setHover]);

  // ── Ctrl+wheel steps density (needs a non-passive listener to block browser zoom)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) >= WHEEL_STEP) {
        dispatch({ type: "STEP_DRAWER_SIZE", dir: acc > 0 ? -1 : 1 });
        acc = 0;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [dispatch]);

  // ── Drag the handle to resize; preview locally, commit on release ─────
  const [dragH, setDragH] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const bodyH = dragH ?? bodyHeight;

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !open) return;
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { startY: e.clientY, startH: bodyHeight, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setDragH(clampDrawerHeight(d.startH + dy, window.innerHeight));
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.moved) {
      suppressClick.current = true;
      if (commit) {
        dispatch({
          type: "SET_DRAWER_HEIGHT",
          height: clampDrawerHeight(d.startH + (d.startY - e.clientY), window.innerHeight),
        });
      }
    }
    setDragH(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onHandleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    dispatch({ type: "TOGGLE_DRAWER" });
  };

  const hoverKey = hover?.key ?? null;

  return (
    <div
      className="pkt-drawer absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-gray-950/90 backdrop-blur-sm shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.8)]"
      style={{
        translate: open ? "0 0" : `0 ${bodyH}px`,
        "--pkt-dur": `${Math.max(120, 350 / speed)}ms`,
      } as React.CSSProperties}
    >
      {/* Handle: click toggles, drag resizes */}
      <div
        className={`h-7 flex items-center gap-2 px-3 text-[11px] select-none touch-none hover:bg-white/5 ${
          dragH !== null ? "cursor-row-resize" : open ? "cursor-pointer" : "cursor-pointer"
        }`}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={(e) => endDrag(e, true)}
        onPointerCancel={(e) => endDrag(e, false)}
        onClick={onHandleClick}
        title="Toggle packet drawer (d) · drag to resize"
      >
        <span className="text-gray-500">{open ? "▾" : "▴"}</span>
        <span className="font-semibold text-gray-200">Packet flow</span>
        <span className="text-gray-500">{scenario.definition.shortName}</span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400 font-mono">Hop {currentHop + 1}/{n}</span>
        <span className="flex-1" />
        {open && !following && (
          <Chip active onClick={follow} title="Re-centre on the active hop" tone="blue">
            Follow ⟳
          </Chip>
        )}
        {open && (
          <>
            <Chip active={expandActive} onClick={() => dispatch({ type: "TOGGLE_DRAWER_EXPAND" })}
                  title="Show the active hop at full size (e)">
              Expand
            </Chip>
            <Chip active={diffOnly} onClick={() => dispatch({ type: "TOGGLE_DRAWER_DIFF_ONLY" })}
                  title="Show only the layers each hop changes (c)">
              Δ only
            </Chip>
            <div className="flex overflow-hidden rounded border border-white/10" role="group" aria-label="Packet size">
              {SIZE_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  className={`px-1.5 py-0.5 text-[10px] font-mono leading-none ${
                    size === s ? "bg-white/15 text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  }`}
                  title={`${SIZE_LABELS[s][1]} packets ([ / ] or Ctrl+wheel)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "SET_DRAWER_SIZE", size: s });
                  }}
                >
                  {SIZE_LABELS[s][0]}
                </button>
              ))}
            </div>
            {bodyHeight !== DRAWER_DEFAULT_H && (
              <button
                type="button"
                className="px-1 text-[11px] text-gray-500 hover:text-gray-200"
                title="Reset drawer height"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "RESET_DRAWER_HEIGHT" });
                }}
              >
                ↺
              </button>
            )}
          </>
        )}
        <span className="text-[9px] text-gray-600">d</span>
      </div>

      {/* Body */}
      <div ref={scrollerRef} className="overflow-auto" style={{ height: bodyH }}>
        <div style={{ width: layout.totalWidth }}>
          <NodeChain
            states={scenario.packetStates}
            deviceRoles={deviceRoles}
            currentHop={currentHop}
            layout={layout}
            clock={clock}
            onSelectHop={selectHop}
          />
          <div className="flex items-start pb-3" style={{ paddingLeft: PAD_X, paddingRight: PAD_X }}>
            {hasOrigin && (
              <TransitionBadges badges={models[0].diff.badges} active={currentHop === 0} past={currentHop > 0} origin />
            )}
            {models.map((m, i) => {
              const isActive = i === currentHop;
              const expanded = expandActive && isActive;
              const detail: PacketDetail = diffOnly ? "diff" : expanded ? "full" : "compact";
              // Only columns that can contain the hovered key need to re-render on hover.
              const colHover = hoverKey && m.layers.some((l) => hoverKey.startsWith(l.id + ".")) ? hoverKey : null;
              return (
                <Fragment key={i}>
                  {i > 0 && (
                    <TransitionBadges badges={m.diff.badges} active={isActive} past={i < currentHop} />
                  )}
                  <div
                    className={`pkt-col shrink-0 rounded-md cursor-pointer ${
                      isActive ? "opacity-100 bg-white/[0.04] ring-1 ring-white/15" : "opacity-70 hover:opacity-90"
                    }`}
                    style={{ width: layout.columnWidth(i), padding: `6px ${COL_PAD}px` }}
                    data-active={isActive || undefined}
                    onClick={() => selectHop(i)}
                  >
                    <PacketSvg
                      layers={m.layers}
                      diff={m.diff}
                      size={layout.sizeFor(i)}
                      detail={detail}
                      ruler={expanded}
                      active={isActive}
                      hopKey={i}
                      hoveredField={colHover}
                      onHoverField={onHover[i]}
                      emptyLabel={diffOnly ? "no header changes" : undefined}
                    />
                    {showBytes && isActive && (
                      <div className="mt-1.5 border-t border-white/10 pt-1.5 overflow-x-auto"
                           onClick={(e) => e.stopPropagation()}>
                        <HexPane
                          bytes={m.bytes}
                          diff={m.diff}
                          perRow={expanded ? 16 : 8}
                          ascii={false}
                          hoveredField={colHover}
                          onHoverField={onHover[i]}
                        />
                      </div>
                    )}
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

function Chip({
  active,
  onClick,
  title,
  tone = "amber",
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  tone?: "amber" | "blue";
  children: ReactNode;
}) {
  const on = tone === "blue" ? "bg-blue-900/40 text-blue-300 hover:bg-blue-800/50" : "bg-amber-900/40 text-amber-300";
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded px-1.5 py-0.5 text-[10px] leading-none transition-colors ${
        active ? on : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
      }`}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
