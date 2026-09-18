import { DRAWER_MIN_H, DRAWER_MAX_VH, DRAWER_DEFAULT_H } from "./drawerLayout";
import { SIZE_ORDER, type PacketSize } from "./packetSvgLayout";

/** Persisted drawer preferences (density and body height). */

export interface DrawerPrefs {
  size: PacketSize;
  height: number;
}

const KEY = "sp-net.drawer";

function storage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function loadDrawerPrefs(): Partial<DrawerPrefs> {
  const s = storage();
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<keyof DrawerPrefs, unknown>>;
    const out: Partial<DrawerPrefs> = {};
    if (typeof parsed.size === "string" && (SIZE_ORDER as readonly string[]).includes(parsed.size)) {
      out.size = parsed.size as PacketSize;
    }
    if (typeof parsed.height === "number" && Number.isFinite(parsed.height)) {
      const vh = typeof window === "undefined" ? Infinity : window.innerHeight * DRAWER_MAX_VH;
      out.height = Math.min(Math.max(DRAWER_MIN_H, Math.round(parsed.height)), Math.max(DRAWER_MIN_H, vh));
    }
    return out;
  } catch {
    return {};
  }
}

export function saveDrawerPrefs(prefs: DrawerPrefs): void {
  const s = storage();
  if (!s) return;
  try {
    if (prefs.size === "drawer" && prefs.height === DRAWER_DEFAULT_H) s.removeItem(KEY);
    else s.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // storage full or blocked; preferences are a convenience only
  }
}
