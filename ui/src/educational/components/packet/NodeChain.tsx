import { useRef } from "react";
import type { DeviceRole } from "../../../types";
import { roleColors } from "../../../utils/colors";
import { getDeviceRole, roleAbbrev } from "../../../utils/roles";
import type { AnimationClock } from "../../animationClock";
import { lerp } from "../../animationClock";
import { useClockFrame } from "../../hooks/useClockFrame";
import { CHAIN_H, NODE_R, columnCenterX, totalWidth } from "../../drawerLayout";
import type { PacketState } from "../../types";

interface Props {
  states: PacketState[];
  deviceRoles: Record<string, DeviceRole>;
  currentHop: number;
  hasOrigin: boolean;
  clock: AnimationClock;
  onSelectHop: (hop: number) => void;
}

const NODE_Y = 24;

/** The hop chain drawn above the packet columns, aligned by shared geometry. */
export function NodeChain({ states, deviceRoles, currentHop, hasOrigin, clock, onSelectHop }: Props) {
  const tokenRef = useRef<SVGGElement>(null);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const n = states.length;
  const width = totalWidth(n, hasOrigin);
  const cx = (i: number) => columnCenterX(i, hasOrigin);

  useClockFrame(clock, ({ fromHop, toHop, t }) => {
    const el = tokenRef.current;
    if (!el) return;
    const x = lerp(cx(Math.min(fromHop, n - 1)), cx(Math.min(toHop, n - 1)), t);
    el.setAttribute("transform", `translate(${x},${NODE_Y})`);
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      const approaching = i === toHop && toHop !== fromHop && t > 0.8 && t < 1;
      ring.classList.toggle("pkt-approaching", approaching);
    });
  });

  return (
    <svg width={width} height={CHAIN_H} className="block shrink-0 select-none"
         fontFamily="ui-sans-serif, system-ui, sans-serif">
      {/* links */}
      {states.slice(0, -1).map((_, i) => {
        const past = i < currentHop;
        return (
          <line key={`l${i}`} x1={cx(i) + NODE_R} y1={NODE_Y} x2={cx(i + 1) - NODE_R} y2={NODE_Y}
                stroke={past ? "#60a5fa" : "#374151"} strokeWidth={past ? 2 : 1.5}
                strokeDasharray={past ? undefined : "4 3"} />
        );
      })}
      {/* nodes */}
      {states.map((st, i) => {
        const role = getDeviceRole(st.device, deviceRoles);
        const color = roleColors[role];
        const isActive = i === currentHop;
        const x = cx(i);
        return (
          <g key={st.device + i} className="cursor-pointer" onClick={() => onSelectHop(i)}>
            <title>{`Hop ${i + 1}: ${st.device}`}</title>
            <circle ref={(el) => { ringRefs.current[i] = el; }} cx={x} cy={NODE_Y} r={NODE_R + 4}
                    fill="none" stroke={color} strokeWidth={2} opacity={isActive ? 0.9 : 0} />
            <circle cx={x} cy={NODE_Y} r={NODE_R} fill={color} stroke="#fff" strokeWidth={isActive ? 2 : 1.5}
                    opacity={isActive ? 1 : i < currentHop ? 0.75 : 0.5} />
            <text x={x} y={NODE_Y} dy="0.35em" textAnchor="middle" fill="#fff" fontSize={10} fontWeight={700}
                  pointerEvents="none">
              {roleAbbrev[role]}
            </text>
            <text x={x} y={NODE_Y + NODE_R + 12} textAnchor="middle" fontSize={10.5}
                  fontWeight={isActive ? 700 : 500} fill={isActive ? "#fff" : "#9ca3af"} pointerEvents="none">
              {st.device}
            </text>
            {st.ingressInterface && (
              <text x={x - NODE_R - 5} y={NODE_Y - 6} textAnchor="end" fontSize={8.5} fill="#6b7280"
                    fontFamily="ui-monospace, monospace" pointerEvents="none">
                in {st.ingressInterface}
              </text>
            )}
            {st.egressInterface && (
              <text x={x + NODE_R + 5} y={NODE_Y - 6} textAnchor="start" fontSize={8.5} fill="#6b7280"
                    fontFamily="ui-monospace, monospace" pointerEvents="none">
                out {st.egressInterface}
              </text>
            )}
          </g>
        );
      })}
      {/* token */}
      <g ref={tokenRef} transform={`translate(${cx(Math.min(currentHop, n - 1))},${NODE_Y})`}
         filter="url(#packet-glow)" pointerEvents="none">
        <circle r={7} fill="#fbbf24" stroke="#fff" strokeWidth={1.5} />
        <text y={1} textAnchor="middle" dominantBaseline="middle" fill="#111827" fontSize={7} fontWeight={800}>P</text>
      </g>
    </svg>
  );
}
