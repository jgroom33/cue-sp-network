import { useEffect, useRef } from "react";
import type { AnimationState, ComputedScenario } from "../types";
import type { AnimationClock } from "../animationClock";
import { lerp } from "../animationClock";
import { useClockFrame } from "../hooks/useClockFrame";

interface Props {
  scenario: ComputedScenario;
  animation: AnimationState;
  nodePositions: Map<string, { x: number; y: number }>;
  clock: AnimationClock;
}

const QOS_COLORS: Record<string, string> = {
  voice: "#ef4444",
  video: "#f97316",
  "critical-data": "#eab308",
  "bulk-data": "#3b82f6",
  "network-control": "#a855f7",
  "best-effort": "#6b7280",
};

/**
 * Topology overlay: highlighted path, trail, and the packet token. The token
 * is positioned imperatively from clock frames (no React render per frame).
 */
export function PacketAnimationLayer({
  scenario,
  animation,
  nodePositions,
  clock,
}: Props) {
  const tokenRef = useRef<SVGGElement>(null);
  const posRef = useRef(nodePositions);
  const pathRef = useRef(scenario.path);
  useEffect(() => {
    posRef.current = nodePositions;
    pathRef.current = scenario.path;
  }, [nodePositions, scenario.path]);

  const packetColor =
    QOS_COLORS[scenario.packetStates[animation.currentHop]?.qosClass ?? ""] ??
    "#3b82f6";

  useClockFrame(clock, ({ fromHop, toHop, t }) => {
    const el = tokenRef.current;
    if (!el) return;
    const path = pathRef.current;
    const a = posRef.current.get(path[fromHop]);
    const b = posRef.current.get(path[toHop]) ?? a;
    if (!a || !b) return;
    el.setAttribute(
      "transform",
      `translate(${lerp(a.x, b.x, t)},${lerp(a.y, b.y, t)})`
    );
  });

  // Node dragged / layout changed: re-place the token from the last frame
  useEffect(() => {
    clock.refresh();
  }, [clock, nodePositions]);

  const currentPos = nodePositions.get(scenario.path[animation.currentHop]);
  if (!currentPos) return null;

  // Build trail positions (previous hops)
  const trail: { x: number; y: number; opacity: number }[] = [];
  for (let i = Math.max(0, animation.currentHop - 3); i < animation.currentHop; i++) {
    const pos = nodePositions.get(scenario.path[i]);
    if (pos) {
      const age = animation.currentHop - i;
      trail.push({ x: pos.x, y: pos.y, opacity: 0.3 / age });
    }
  }

  return (
    <g className="packet-animation-layer">
      {/* Active path highlighting */}
      {scenario.pathLinks.map((link, i) => {
        const src = nodePositions.get(link.source);
        const dst = nodePositions.get(link.target);
        if (!src || !dst) return null;

        const isActive =
          i === animation.currentHop || i === animation.currentHop - 1;
        const isPast = i < animation.currentHop;

        return (
          <line
            key={`path-${i}`}
            x1={src.x}
            y1={src.y}
            x2={dst.x}
            y2={dst.y}
            stroke={packetColor}
            strokeWidth={isActive ? 3 : 2}
            strokeLinecap="round"
            opacity={isActive ? 0.7 : isPast ? 0.3 : 0.15}
          />
        );
      })}

      {/* Trail */}
      {trail.map((t, i) => (
        <circle
          key={`trail-${i}`}
          cx={t.x}
          cy={t.y}
          r={4}
          fill={packetColor}
          opacity={t.opacity}
        />
      ))}

      {/* Packet token — transform written by the clock */}
      <g
        ref={tokenRef}
        transform={`translate(${currentPos.x},${currentPos.y})`}
        filter="url(#packet-glow)"
      >
        <circle r={8} fill={packetColor} stroke="white" strokeWidth={2} />
        <text
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={8}
          fontWeight="bold"
          pointerEvents="none"
        >
          P
        </text>
      </g>
    </g>
  );
}
