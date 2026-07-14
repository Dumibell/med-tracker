import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Run `onResume` every time the app returns to the foreground.
 *
 * A backgrounded screen keeps rendering exactly what it rendered when it went
 * away — React has no reason to re-render, and `useFocusEffect` only fires on
 * navigation, not on app resume. So anything derived from "지금" (활성 슬롯,
 * 오늘 날짜, 상대 시각) has to be recomputed here, or the user comes back hours
 * later to a screen that still believes it's morning.
 */
export function useAppResume(onResume: () => void) {
  const handler = useRef(onResume);
  handler.current = onResume;

  useEffect(() => {
    let previous = AppState.currentState;

    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        // Fire on any non-active → active transition. "inactive" covers the
        // short trips (app switcher, notification pull, Face ID) as well as a
        // full "background", and recomputing on those is cheap and harmless.
        if (previous !== "active" && next === "active") {
          handler.current();
        }
        previous = next;
      },
    );

    return () => subscription.remove();
  }, []);
}
