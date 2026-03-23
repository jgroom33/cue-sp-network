import type { ComputedScenario } from "../types";
import { cloudPath, cloudLabelPosition } from "../../utils/clouds";

interface Props {
  scenario: ComputedScenario;
  nodePositions: Map<string, { x: number; y: number }>;
  visible: boolean;
  deviceRoles?: Record<string, string>;
}

const overlayStyles: Record<string, { stroke: string; dashArray?: string; label?: string }> = {
  l3vpn: { stroke: "#3b82f6", label: "L3VPN" },
  vxlan: { stroke: "#8b5cf6", dashArray: "8,4", label: "VXLAN Tunnel" },
  l2vpn: { stroke: "#14b8a6", dashArray: "4,4", label: "Pseudowire" },
  internet: { stroke: "#06b6d4", label: "Internet Path" },
};

// Roles that belong inside the SP cloud (provider-owned devices)
const SP_CORE_ROLES = new Set(["PE", "P", "RR", "ASBR", "AGG", "NID", "PCE"]);

export function ServiceOverlay({ scenario, nodePositions, visible, deviceRoles }: Props) {
  if (!visible || !scenario.definition.overlayType) return null;

  const style = overlayStyles[scenario.definition.overlayType] ?? overlayStyles.l3vpn;

  // Identify SP core devices in the path for the cloud
  const coreDevices = deviceRoles
    ? scenario.path.filter((dev) => SP_CORE_ROLES.has(deviceRoles[dev] ?? ""))
    : [];
  const corePositions = coreDevices
    .map((dev) => nodePositions.get(dev))
    .filter((p): p is { x: number; y: number } => !!p);

  // Check if this is an ENNI scenario (has ENNI devices in path)
  const isEnni = scenario.definition.id.startsWith("mef-enni");

  // For ENNI: split cloud into two carrier domains
  let carrierACoreDevs: string[] = [];
  let carrierBCoreDevs: string[] = [];
  if (isEnni && deviceRoles) {
    // Find the ENNI boundary — devices before the mid-P-core go to A, after to B
    const pathRoles = scenario.path.map((d) => ({ dev: d, role: deviceRoles[d] ?? "" }));
    const pDevices = pathRoles.filter((d) => d.role === "P");
    const midP = pDevices.length > 0 ? pDevices[Math.floor(pDevices.length / 2)].dev : "";

    let inCarrierA = true;
    for (const { dev, role } of pathRoles) {
      if (dev === midP) inCarrierA = false;
      if (SP_CORE_ROLES.has(role) || role === "NID") {
        if (inCarrierA) carrierACoreDevs.push(dev);
        else carrierBCoreDevs.push(dev);
      }
    }
  }

  const carrierAPositions = carrierACoreDevs
    .map((d) => nodePositions.get(d))
    .filter((p): p is { x: number; y: number } => !!p);
  const carrierBPositions = carrierBCoreDevs
    .map((d) => nodePositions.get(d))
    .filter((p): p is { x: number; y: number } => !!p);

  return (
    <g className="service-overlay">
      {/* SP Cloud(s) behind path */}
      {isEnni && carrierAPositions.length >= 2 && carrierBPositions.length >= 2 ? (
        <>
          {/* Carrier A cloud */}
          <path
            d={cloudPath(carrierAPositions, 50)}
            fill={style.stroke}
            fillOpacity={0.04}
            stroke={style.stroke}
            strokeOpacity={0.2}
            strokeWidth={1.5}
            strokeDasharray="8,4"
          />
          {(() => {
            const lp = cloudLabelPosition(carrierAPositions, 50);
            return (
              <text x={lp.x} y={lp.y} fill={style.stroke} fontSize={9} fontWeight="600" opacity={0.6}>
                Carrier A
              </text>
            );
          })()}
          {/* Carrier B cloud */}
          <path
            d={cloudPath(carrierBPositions, 50)}
            fill={style.stroke}
            fillOpacity={0.04}
            stroke={style.stroke}
            strokeOpacity={0.2}
            strokeWidth={1.5}
            strokeDasharray="8,4"
          />
          {(() => {
            const lp = cloudLabelPosition(carrierBPositions, 50);
            return (
              <text x={lp.x} y={lp.y} fill={style.stroke} fontSize={9} fontWeight="600" opacity={0.6}>
                Carrier B
              </text>
            );
          })()}
          {/* ENNI handoff indicator between clouds */}
          {(() => {
            const aCx = carrierAPositions.reduce((s, p) => s + p.x, 0) / carrierAPositions.length;
            const aCy = carrierAPositions.reduce((s, p) => s + p.y, 0) / carrierAPositions.length;
            const bCx = carrierBPositions.reduce((s, p) => s + p.x, 0) / carrierBPositions.length;
            const bCy = carrierBPositions.reduce((s, p) => s + p.y, 0) / carrierBPositions.length;
            const mx = (aCx + bCx) / 2;
            const my = (aCy + bCy) / 2;
            return (
              <>
                <line x1={aCx} y1={aCy} x2={bCx} y2={bCy}
                  stroke="#f97316" strokeWidth={2} strokeDasharray="6,4" opacity={0.5} />
                <text x={mx} y={my - 8} textAnchor="middle"
                  fill="#f97316" fontSize={8} fontWeight="bold" opacity={0.7}>
                  ENNI
                </text>
              </>
            );
          })()}
        </>
      ) : corePositions.length >= 2 ? (
        <>
          <path
            d={cloudPath(corePositions, 50)}
            fill={style.stroke}
            fillOpacity={0.04}
            stroke={style.stroke}
            strokeOpacity={0.2}
            strokeWidth={1.5}
            strokeDasharray="8,4"
          />
          {(() => {
            const lp = cloudLabelPosition(corePositions, 50);
            return (
              <text x={lp.x} y={lp.y} fill={style.stroke} fontSize={9} fontWeight="600" opacity={0.6}>
                SP Network
              </text>
            );
          })()}
        </>
      ) : null}

      {/* Path highlight lines */}
      <g opacity={0.6}>
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
