import { memo } from "react";
import { protocolColors } from "../../../utils/colors";
import type { PacketDiff } from "../../packetDiff";
import { fieldKey } from "../../packetDiff";
import type { PacketLayer } from "../../packetLayers";
import {
  GRID_BITS,
  RULER_H,
  SIZES,
  fitText,
  layoutPacket,
  type LayerGeom,
  type PacketSize,
  type SizeSpec,
} from "../../packetSvgLayout";

export interface PacketSvgProps {
  layers: PacketLayer[];
  diff?: PacketDiff;
  size: PacketSize;
  detail: "compact" | "full";
  active: boolean;
  /** Changes per hop in the panel so ghost/value keys remount and animate. */
  hopKey?: number;
  ruler?: boolean;
  hoveredField?: string | null;
  onHoverField?: (key: string | null) => void;
  className?: string;
}

const alpha = (hex: string, a: string) => `${hex}${a}`;
const TEXT = "#e5e7eb";
const MUTED = "#9ca3af";

function PacketSvgImpl({
  layers,
  diff,
  size: sizeKey,
  detail,
  active,
  hopKey = 0,
  ruler = false,
  hoveredField,
  onHoverField,
  className,
}: PacketSvgProps) {
  const size = SIZES[sizeKey];
  const geom = layoutPacket(layers, diff, sizeKey, { detail, ruler });
  const added = new Set(diff?.addedLayers ?? []);
  const changed = new Map(diff?.changedFields.map((c) => [fieldKey(c.layerId, c.fieldId), c]) ?? []);

  return (
    <svg
      className={`pkt-svg block overflow-visible ${className ?? ""}`}
      width={geom.width}
      height={Math.max(geom.height, 1)}
      viewBox={`0 0 ${geom.width} ${Math.max(geom.height, 1)}`}
      fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
      fontSize={size.font}
    >
      {ruler && <Ruler size={size} />}
      {geom.layers.map((g) => (
        <g key={g.layer.id} className="pkt-row" style={{ translate: `0 ${g.y}px` }}>
          <g className={added.has(g.layer.id) ? "pkt-anim-enter" : undefined}
             filter={active && added.has(g.layer.id) ? "url(#layer-glow)" : undefined}>
            <LayerBody
              geom={g}
              size={size}
              detail={detail}
              active={active}
              changed={changed}
              hopKey={hopKey}
              hoveredField={hoveredField}
              onHoverField={onHoverField}
            />
          </g>
        </g>
      ))}
      {geom.ghosts.map((g) => (
        <g key={`ghost-${g.layer.id}-${hopKey}`} className="pkt-ghost" style={{ translate: `0 ${g.y}px` }}>
          <LayerBody geom={g} size={size} detail={detail} active={false} changed={new Map()} hopKey={hopKey} ghost />
        </g>
      ))}
    </svg>
  );
}

export const PacketSvg = memo(PacketSvgImpl);

function Ruler({ size }: { size: SizeSpec }) {
  const W = GRID_BITS * size.bitW;
  return (
    <g fill={MUTED} fontSize={size.font * 0.85}>
      {[0, 8, 16, 24].map((b) => (
        <g key={b}>
          <line x1={b * size.bitW} y1={RULER_H - 4} x2={b * size.bitW} y2={RULER_H} stroke="#4b5563" />
          <text x={b * size.bitW + 2} y={RULER_H - 5}>{b}</text>
        </g>
      ))}
      <text x={W - 2} y={RULER_H - 5} textAnchor="end">31</text>
      <line x1={0} y1={RULER_H} x2={W} y2={RULER_H} stroke="#4b5563" />
    </g>
  );
}

interface BodyProps {
  geom: LayerGeom;
  size: SizeSpec;
  detail: "compact" | "full";
  active: boolean;
  changed: Map<string, { from: string; fromCompact: string; to: string; fromRaw: number; toRaw: number }>;
  hopKey: number;
  ghost?: boolean;
  hoveredField?: string | null;
  onHoverField?: (key: string | null) => void;
}

function LayerBody({ geom, size, detail, active, changed, hopKey, ghost, hoveredField, onHoverField }: BodyProps) {
  const { layer } = geom;
  const color = protocolColors[layer.color];
  const W = GRID_BITS * size.bitW;
  const titleH = layer.continuation ? 0 : size.titleH;
  const full = detail === "full";

  return (
    <g>
      {titleH > 0 && (
        <g>
          <rect x={0} y={0} width={W} height={titleH} fill={alpha(color, "40")} stroke={color} strokeWidth={1}
                rx={full ? 2 : 1} shapeRendering="crispEdges" />
          <text className="pkt-text" x={4} y={titleH / 2 + 0.5} dominantBaseline="middle"
                fill={color} fontWeight={700} fontSize={size.font}>
            {fitText(layer.name, layer.subtitle ? W * 0.45 : W - 8, size.font)}
          </text>
          {layer.subtitle && (
            <text className="pkt-text" x={W - 4} y={titleH / 2 + 0.5} dominantBaseline="middle" textAnchor="end"
                  fill={MUTED} fontSize={size.font * 0.9}>
              {fitText(layer.subtitle, W * 0.52, size.font * 0.9)}
            </text>
          )}
        </g>
      )}

      {geom.mode === "strip" ? (
        <g style={{ translate: `0 ${geom.bodyY}px` }}>
          <rect x={0} y={0} width={W} height={size.stripH} fill={alpha(color, ghost ? "10" : "1a")}
                stroke={color} strokeWidth={1} strokeOpacity={0.7} shapeRendering="crispEdges" />
          <text className="pkt-text" x={4} y={size.stripH / 2 + 0.5} dominantBaseline="middle" fill={TEXT}
                fontSize={size.font}>
            {fitText(
              layer.continuation || layer.kind === "payload" || !titleH
                ? `${layer.name} · ${layer.summary}`
                : layer.summary,
              W - 8,
              size.font
            )}
          </text>
        </g>
      ) : (
        <g style={{ translate: `0 ${geom.bodyY}px` }}>
          {geom.fields.map((fg) => {
            const ch = changed.get(fg.key);
            const isHover = hoveredField === fg.key;
            const valueFont = full ? size.font : size.font;
            const label = full ? fg.field.short : "";
            const kind = fg.field.role === "addr" ? (fg.field.bits === 48 ? "mac" : "ip") : "generic";
            const avail = fg.labelW - 4;
            const fits = (t: string) => t.length * valueFont * 0.6 <= avail;
            // Prefer the full display; fall back to the compact form before ellipsizing.
            const value = full && fits(fg.field.display) ? fg.field.display : fg.field.compact;
            const valueText = fitText(value, avail, valueFont, kind);
            const labelText = label ? fitText(label, fg.labelW - 4, size.font * 0.75) : "";
            const valueY = full && labelText ? fg.labelY + size.rowH * 0.18 : fg.labelY;
            return (
              <g key={fg.key}
                 onMouseEnter={onHoverField ? () => onHoverField(fg.key) : undefined}
                 onMouseLeave={onHoverField ? () => onHoverField(null) : undefined}>
                <path
                  d={fg.path}
                  fill={alpha(color, ch ? "3d" : isHover ? "33" : "1f")}
                  stroke={isHover ? "#ffffff" : color}
                  strokeWidth={isHover ? 1.5 : 1}
                  strokeOpacity={isHover ? 1 : 0.8}
                  className={ch ? "pkt-anim-flash" : undefined}
                  style={ch ? ({ "--pkt-flash-end": color } as React.CSSProperties) : undefined}
                  filter={active && ch ? "url(#field-glow)" : undefined}
                  shapeRendering="crispEdges"
                >
                  <title>{`${fg.field.name}: ${fg.field.display}${ch ? ` (was ${ch.from})` : ""}`}</title>
                </path>
                {labelText && (
                  <text className="pkt-text" x={fg.labelX} y={fg.labelY - size.rowH * 0.24} textAnchor="middle"
                        dominantBaseline="middle" fill={MUTED} fontSize={size.font * 0.75} pointerEvents="none">
                    {labelText}
                  </text>
                )}
                {valueText && (
                  <g key={`${fg.key}:${fg.field.raw}`} className={ch ? "pkt-anim-val-in" : undefined}>
                    <text className="pkt-text" x={fg.labelX} y={valueY} textAnchor="middle" dominantBaseline="middle"
                          fill={ch ? "#fde68a" : fg.field.role === "key" ? "#ffffff" : TEXT}
                          fontWeight={fg.field.role === "key" || ch ? 700 : 500} fontSize={valueFont}
                          pointerEvents="none">
                      {valueText}
                    </text>
                  </g>
                )}
                {ch && valueText && (
                  <g key={`${fg.key}:old:${hopKey}`} className="pkt-val-out">
                    <text className="pkt-text" x={fg.labelX} y={valueY} textAnchor="middle" dominantBaseline="middle"
                          fill="#fca5a5" fontSize={valueFont} pointerEvents="none">
                      {fitText(full && fits(ch.from) ? ch.from : ch.fromCompact, avail, valueFont, kind)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
}
