import { easeCubicInOut } from "d3";

/**
 * Sub-hop playback time, kept outside React state so the two packet tokens
 * (topology + drawer) can be moved every frame with zero React renders.
 */

export interface ClockState {
  hop: number;
  progress: number; // 0..1 linear, between hop and hop+1
}

export interface ClockFrame {
  fromHop: number;
  toHop: number;
  t: number; // eased 0..1
}

export type ClockEvent = "none" | "hop" | "end";

const MAX_DT_MS = 100;

/** Pure step function: advance by dt, carrying any remainder into the next hop. */
export function advanceFrame(
  s: ClockState,
  dtMs: number,
  hopDurationMs: number,
  maxHop: number
): { next: ClockState; event: ClockEvent } {
  const dt = Math.min(Math.max(dtMs, 0), MAX_DT_MS);
  if (s.hop >= maxHop) {
    return { next: { hop: maxHop, progress: 0 }, event: "end" };
  }
  const progress = s.progress + dt / hopDurationMs;
  if (progress >= 1) {
    const hop = s.hop + 1;
    if (hop >= maxHop) {
      return { next: { hop: maxHop, progress: 0 }, event: "end" };
    }
    return { next: { hop, progress: progress - 1 }, event: "hop" };
  }
  return { next: { hop: s.hop, progress }, event: "none" };
}

export interface AnimationClock {
  subscribe(cb: (f: ClockFrame) => void): () => void;
  getState(): ClockState;
  setMaxHop(n: number): void;
  /** Advance playback; returns "hop" when a hop boundary was crossed. */
  advance(dtMs: number, hopDurationMs: number): ClockEvent;
  /** Jump to a hop; tweenMs 0 snaps, otherwise the token eases over tweenMs. */
  jumpTo(hop: number, tweenMs: number): void;
  /** Re-emit the last frame (e.g. node positions changed). */
  refresh(): void;
  /** Cancel any in-flight tween. */
  dispose(): void;
}

export function createAnimationClock(): AnimationClock {
  let state: ClockState = { hop: 0, progress: 0 };
  let maxHop = 0;
  let lastFrame: ClockFrame = { fromHop: 0, toHop: 0, t: 0 };
  let tweenRaf = 0;
  const subs = new Set<(f: ClockFrame) => void>();

  const emit = (f: ClockFrame) => {
    lastFrame = f;
    for (const cb of subs) cb(f);
  };

  const cancelTween = () => {
    if (tweenRaf) {
      cancelAnimationFrame(tweenRaf);
      tweenRaf = 0;
    }
  };

  return {
    subscribe(cb) {
      subs.add(cb);
      cb(lastFrame);
      return () => {
        subs.delete(cb);
      };
    },
    getState: () => state,
    setMaxHop(n) {
      maxHop = Math.max(0, n);
      if (state.hop > maxHop) state = { hop: maxHop, progress: 0 };
    },
    advance(dtMs, hopDurationMs) {
      cancelTween();
      const { next, event } = advanceFrame(state, dtMs, hopDurationMs, maxHop);
      state = next;
      const toHop = Math.min(state.hop + 1, maxHop);
      emit({ fromHop: state.hop, toHop, t: easeCubicInOut(state.progress) });
      return event;
    },
    jumpTo(hop, tweenMs) {
      const target = Math.max(0, Math.min(hop, maxHop));
      const from = state.hop;
      cancelTween();
      state = { hop: target, progress: 0 };
      if (tweenMs <= 0 || from === target || typeof requestAnimationFrame !== "function") {
        emit({ fromHop: target, toHop: target, t: 0 });
        return;
      }
      let start = 0;
      const step = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / tweenMs);
        emit({ fromHop: from, toHop: target, t: easeCubicInOut(t) });
        if (t < 1) tweenRaf = requestAnimationFrame(step);
        else tweenRaf = 0;
      };
      tweenRaf = requestAnimationFrame(step);
    },
    refresh() {
      emit(lastFrame);
    },
    dispose() {
      cancelTween();
      subs.clear();
    },
  };
}

/** Linear interpolation helper shared by token renderers. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
