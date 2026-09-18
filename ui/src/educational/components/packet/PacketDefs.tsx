/**
 * Shared SVG filter definitions, mounted once in App. `url(#id)` references
 * resolve document-wide, so the topology overlay, drawer, and panel all reuse
 * these. Not display:none — Safari won't resolve filters from hidden SVGs.
 */
export function PacketDefs() {
  return (
    <svg width={0} height={0} className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="packet-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="field-glow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#fbbf24" floodOpacity="0.85" />
        </filter>
        <filter id="layer-glow" x="-10%" y="-30%" width="120%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.45" />
        </filter>
      </defs>
    </svg>
  );
}
