import type { ComputedScenario } from "../types";

interface Props {
  scenario: ComputedScenario;
  nodePositions: Map<string, { x: number; y: number }>;
  visible: boolean;
}

const overlayStyles: Record<string, { stroke: string; dashArray?: string; label?: string }> = {
  l3vpn: { stroke: "#3b82f6", label: "L3VPN" },
  vxlan: { stroke: "#8b5cf6", dashArray: "8,4", label: "VXLAN Tunnel" },
  l2vpn: { stroke: "#14b8a6", dashArray: "4,4", label: "Pseudowire" },
  internet: { stroke: "#06b6d4", label: "Internet Path" },
};

export function ServiceOverlay({ scenario, nodePositions, visible }: Props) {
  if (!visible || !scenario.definition.overlayType) return null;

  const style = overlayStyles[scenario.definition.overlayType] ?? overlayStyles.l3vpn;

  return (
    <g className="service-overlay" opacity={0.6}>
      {/* Path highlight lines */}
      {scenario.pathLinks.map((link, i) => {
        const src = nodePositions.get(link.source);
        const dst = nodePositions.get(link.target);
        if (!src || !dst) return null;

        return (
          <line
            key={`overlay-${i}`}
            x1={src.x}
            y1={src.y}
            x2={dst.x}
            y2={dst.y}
            stroke={style.stroke}
            strokeWidth={4}
            strokeDasharray={style.dashArray}
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })}

      {/* Service label at midpoint of path */}
      {style.label && scenario.pathLinks.length > 0 && (() => {
        const midIdx = Math.floor(scenario.pathLinks.length / 2);
        const midLink = scenario.pathLinks[midIdx];
        const src = nodePositions.get(midLink.source);
        const dst = nodePositions.get(midLink.target);
        if (!src || !dst) return null;
        const mx = (src.x + dst.x) / 2;
        const my = (src.y + dst.y) / 2 - 15;

        return (
          <text
            x={mx}
            y={my}
            textAnchor="middle"
            fill={style.stroke}
            fontSize={10}
            fontWeight="bold"
            opacity={0.8}
          >
            {style.label}
          </text>
        );
      })()}

      {/* Highlight path member nodes */}
      {scenario.path.map((dev) => {
        const pos = nodePositions.get(dev);
        if (!pos) return null;
        return (
          <circle
            key={`node-highlight-${dev}`}
            cx={pos.x}
            cy={pos.y}
            r={28}
            fill="none"
            stroke={style.stroke}
            strokeWidth={2}
            strokeDasharray="4,2"
            opacity={0.4}
          />
        );
      })}
    </g>
  );
}

/**
 * Render disabled link indicators (red X) for what-if mode
 */
export function DisabledLinkOverlay({
  disabledLinks,
  nodePositions,
}: {
  disabledLinks: Set<string>;
  nodePositions: Map<string, { x: number; y: number }>;
}) {
  if (disabledLinks.size === 0) return null;

  return (
    <g className="disabled-links">
      {Array.from(disabledLinks).map((linkKey) => {
        const [a, b] = linkKey.split("::");
        const posA = nodePositions.get(a);
        const posB = nodePositions.get(b);
        if (!posA || !posB) return null;

        const mx = (posA.x + posB.x) / 2;
        const my = (posA.y + posB.y) / 2;

        return (
          <g key={`disabled-${linkKey}`}>
            {/* Red overlay on link */}
            <line
              x1={posA.x}
              y1={posA.y}
              x2={posB.x}
              y2={posB.y}
              stroke="#ef4444"
              strokeWidth={3}
              strokeDasharray="6,3"
              opacity={0.6}
            />
            {/* X mark */}
            <g transform={`translate(${mx},${my})`}>
              <circle r={10} fill="#991b1b" stroke="#ef4444" strokeWidth={1.5} />
              <line x1={-4} y1={-4} x2={4} y2={4} stroke="#ef4444" strokeWidth={2} />
              <line x1={4} y1={-4} x2={-4} y2={4} stroke="#ef4444" strokeWidth={2} />
            </g>
          </g>
        );
      })}
    </g>
  );
}
