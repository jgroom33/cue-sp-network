import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./useAnimationDriver";

/**
 * Keep the active hop centered in a horizontal scroller. Pauses while the
 * user is interacting with the scroller (pointer inside, or shortly after a
 * wheel event); `follow()` re-centers and resumes.
 */
export function useAutoScroll(
  ref: React.RefObject<HTMLElement | null>,
  currentHop: number,
  targetFor: (viewportW: number) => number,
  enabled: boolean
) {
  const [userScrolled, setUserScrolled] = useState(false);
  const targetRef = useRef(targetFor);
  useEffect(() => {
    targetRef.current = targetFor;
  }, [targetFor]);
  const insideRef = useRef(false);

  const scrollToHop = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({
      left: targetRef.current(el.clientWidth),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [ref]);

  useEffect(() => {
    if (!enabled || userScrolled || insideRef.current) return;
    scrollToHop();
  }, [currentHop, enabled, userScrolled, scrollToHop]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEnter = () => {
      insideRef.current = true;
    };
    const onLeave = () => {
      insideRef.current = false;
    };
    const onWheel = () => setUserScrolled(true);
    const onDown = () => setUserScrolled(true);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("pointerdown", onDown);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
    };
  }, [ref]);

  const follow = useCallback(() => {
    setUserScrolled(false);
    scrollToHop();
  }, [scrollToHop]);

  return { following: !userScrolled, follow };
}
