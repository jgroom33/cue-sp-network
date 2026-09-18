import { useEffect, useRef } from "react";
import type { AnimationClock } from "../animationClock";
import type { EducationalAction } from "../types";

interface Options {
  playing: boolean;
  speed: number;
  currentHop: number;
  maxHop: number;
  dispatch: React.Dispatch<EducationalAction>;
}

export const HOP_DURATION_MS = 1500;
export const JUMP_TWEEN_MS = 300;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Drives the animation clock from the reducer's playback state. The rAF loop
 * only dispatches at hop boundaries; sub-hop time never touches React state.
 */
export function useAnimationDriver(
  clock: AnimationClock,
  { playing, speed, currentHop, maxHop, dispatch }: Options
) {
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    clock.setMaxHop(maxHop);
  }, [clock, maxHop]);

  // External hop changes (timeline click, arrow keys, clock-driven SET_HOP)
  useEffect(() => {
    const snap = playingRef.current || prefersReducedMotion();
    clock.jumpTo(currentHop, snap ? 0 : JUMP_TWEEN_MS);
  }, [clock, currentHop]);

  // Playback loop
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = 0;
    const hopDuration = HOP_DURATION_MS / speed;

    const tick = (now: number) => {
      if (!last) last = now;
      const dt = now - last;
      last = now;
      const ev = clock.advance(dt, hopDuration);
      if (ev === "hop") {
        dispatch({ type: "SET_HOP", hop: clock.getState().hop });
      } else if (ev === "end") {
        dispatch({ type: "PAUSE" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clock, playing, speed, dispatch]);
}
