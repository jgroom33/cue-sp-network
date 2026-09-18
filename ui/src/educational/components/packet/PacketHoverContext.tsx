import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { HoverAnchor } from "../../tooltipLayout";

/**
 * Shared "which field is under the pointer" state. Lives outside the
 * educational reducer because it changes at pointer speed and must not
 * re-render the topology graph.
 */

export interface PacketHover {
  key: string; // `${layerId}.${fieldId}`
  hop: number;
  anchor?: HoverAnchor; // viewport rect of the hovered cell, when known
}

interface Ctx {
  hover: PacketHover | null;
  setHover: (h: PacketHover | null) => void;
}

const PacketHoverCtx = createContext<Ctx>({ hover: null, setHover: () => {} });

export function PacketHoverProvider({ children }: { children: ReactNode }) {
  const [hover, setHover] = useState<PacketHover | null>(null);
  const value = useMemo(() => ({ hover, setHover }), [hover]);
  return <PacketHoverCtx.Provider value={value}>{children}</PacketHoverCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePacketHover(): Ctx {
  return useContext(PacketHoverCtx);
}
