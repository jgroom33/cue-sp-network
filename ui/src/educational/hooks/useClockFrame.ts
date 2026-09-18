import { useEffect, useRef } from "react";
import type { AnimationClock, ClockFrame } from "../animationClock";

/**
 * Subscribe to clock frames with a ref-latest callback. The callback should
 * write to DOM refs directly; it must not set React state.
 */
export function useClockFrame(
  clock: AnimationClock,
  cb: (f: ClockFrame) => void
) {
  const cbRef = useRef(cb);
  useEffect(() => {
    cbRef.current = cb;
  });
  useEffect(() => clock.subscribe((f) => cbRef.current(f)), [clock]);
}
