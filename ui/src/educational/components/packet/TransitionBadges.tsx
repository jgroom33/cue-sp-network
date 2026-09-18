import { protocolColors } from "../../../utils/colors";
import type { TransitionBadge } from "../../packetDiff";
import { BADGE_W } from "../../drawerLayout";

interface Props {
  badges: TransitionBadge[];
  active: boolean;
  past: boolean;
  origin?: boolean;
}

/** Diff pills between two hop columns (or before column 0 for origin pushes). */
export function TransitionBadges({ badges, active, past, origin = false }: Props) {
  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-start gap-1 pt-7 transition-opacity ${
        active ? "opacity-100" : past ? "opacity-60" : "opacity-35"
      }`}
      style={{ width: BADGE_W }}
      data-active={active || undefined}
    >
      {badges.length === 0 && !origin && (
        <span className="text-[9px] text-gray-600">forward</span>
      )}
      {badges.map((b, i) => {
        const color = protocolColors[b.color];
        return (
          <span
            key={b.id}
            className={`pkt-anim-badge inline-block max-w-full truncate rounded-full border px-1.5 py-[1px] text-[8.5px] font-mono font-semibold leading-tight ${
              active ? "shadow-[0_0_10px_-2px_var(--badge-color)]" : ""
            }`}
            style={{
              "--badge-color": color,
              borderColor: `${color}99`,
              color,
              backgroundColor: `${color}1f`,
              animationDelay: `${i * 70}ms`,
            } as React.CSSProperties}
            title={b.text}
          >
            {b.text}
          </span>
        );
      })}
    </div>
  );
}
