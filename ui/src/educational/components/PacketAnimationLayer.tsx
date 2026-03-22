import { useEffect, useRef, useCallback } from "react";
import type { AnimationState, ComputedScenario, EducationalAction } from "../types";

interface Props {
  scenario: ComputedScenario;
  animation: AnimationState;
  nodePositions: Map<string, { x: number; y: number }>;
  dispatch: React.Dispatch<EducationalAction>;
}

const QOS_COLORS: Record<string, string> = {
  voice: "#ef4444",
  video: "#f97316",
  "critical-data": "#eab308",
  "bulk-data": "#3b82f6",
  "network-control": "#a855f7",
  "best-effort": "#6b7280",
};

export function PacketAnimationLayer({
  scenario,
  animation,
  nodePositions,
  dispatch,
}: Props) {
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);
  const lastTimeRef = useRef(0);

  const packetColor =
    QOS_COLORS[scenario.packetStates[animation.currentHop]?.qosClass ?? ""] ??
    "#3b82f6";

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      if (!animation.playing) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Advance progress (speed controls the rate)
      const hopDuration = 1500 / animation.speed; // ms per hop
      progressRef.current += dt / hopDuration;

      if (progressRef.current >= 1) {
        // Move to next hop
        progressRef.current = 0;
        const maxHop = scenario.packetStates.length - 1;
        const nextHop = animation.currentHop + 1;
        if (nextHop > maxHop) {
          dispatch({ type: "PAUSE" });
          return;
        }
        dispatch({ type: "SET_HOP", hop: nextHop });
      }

      dispatch({ type: "SET_PROGRESS", progress: progressRef.current });
      animRef.current = requestAnimationFrame(animate);
    },
    [animation.playing, animation.speed, animation.currentHop, scenario, dispatch]
  );

  useEffect(() => {
    if (animation.playing) {
      lastTimeRef.current = 0;
      progressRef.current = 0;
      animRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animation.playing, animate]);

  // Get packet position (interpolated between current and next hop)
  const currentDevice = scenario.path[animation.currentHop];
  const nextDevice = scenario.path[animation.currentHop + 1];
  const currentPos = nodePositions.get(currentDevice);
  const nextPos = nextDevice ? nodePositions.get(nextDevice) : currentPos;

  if (!currentPos) return null;

  const x = nextPos
    ? currentPos.x + (nextPos.x - currentPos.x) * animation.progress
    : currentPos.x;
  const y = nextPos
    ? currentPos.y + (nextPos.y - currentPos.y) * animation.progress
    : currentPos.y;

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
      {/* SVG filter for glow effect */}
      <defs>
        <filter id="packet-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

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

      {/* Packet dot */}
      <circle
        cx={x}
        cy={y}
        r={8}
        fill={packetColor}
        stroke="white"
        strokeWidth={2}
        filter="url(#packet-glow)"
        style={{ transition: animation.playing ? "none" : "cx 0.3s, cy 0.3s" }}
      />

      {/* Packet inner icon */}
      <text
        x={x}
        y={y + 1}
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
  );
}
