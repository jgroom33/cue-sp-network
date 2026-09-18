import { useEffect } from "react";
import { saveDrawerPrefs } from "../drawerPrefs";
import type { EducationalState } from "../types";

/** Persist the drawer density and height whenever they change. */
export function useDrawerPrefsPersistence(state: Pick<EducationalState, "drawerSize" | "drawerHeight">) {
  const { drawerSize, drawerHeight } = state;
  useEffect(() => {
    saveDrawerPrefs({ size: drawerSize, height: drawerHeight });
  }, [drawerSize, drawerHeight]);
}
