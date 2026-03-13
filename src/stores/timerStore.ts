import { map } from "nanostores";
import type { CalendarEvent } from "../lib/calendar";

export type TimerMode = "idle" | "focus" | "break";

export interface TimerState {
  mode: TimerMode;
  timeLeft: number; // in seconds
  isActive: boolean;
  activeEvent: CalendarEvent | null;
  showPresenceCheck: boolean;
  presenceCheckTimeout: number; // to auto pause if not dismissed
  pomodorosCompletedToday: number;
  isAutoMode: boolean;
}

export const WORK_TIME = 25 * 60; // 25 minutes
export const BREAK_TIME = 5 * 60; // 5 minutes
export const PRESENCE_CHECK_INTERVAL = 15 * 60; // 15 minutes
export const PRESENCE_TIMEOUT = 60; // 60 seconds

export const $timerStore = map<TimerState>({
  mode: "idle",
  timeLeft: WORK_TIME,
  isActive: false,
  activeEvent: null,
  showPresenceCheck: false,
  presenceCheckTimeout: PRESENCE_TIMEOUT,
  pomodorosCompletedToday: 0,
  isAutoMode: false,
});

let intervalId: number | null = null;
let lastPresenceCheck = 0;

export const startTimer = () => {
  if (intervalId) return;

  $timerStore.setKey("isActive", true);
  
  if ($timerStore.get().mode === "idle") {
     $timerStore.setKey("mode", "focus");
  }

  intervalId = window.setInterval(() => {
    const state = $timerStore.get();
    
    // Active presence check logic
    if (state.mode === "focus" && !state.showPresenceCheck) {
       lastPresenceCheck += 1;
       if (lastPresenceCheck >= PRESENCE_CHECK_INTERVAL) {
           $timerStore.setKey("showPresenceCheck", true);
           lastPresenceCheck = 0;
       }
    }

    if (state.showPresenceCheck) {
        const timeout = state.presenceCheckTimeout - 1;
        if (timeout <= 0) {
            pauseTimer();
            $timerStore.setKey("showPresenceCheck", false);
            $timerStore.setKey("presenceCheckTimeout", PRESENCE_TIMEOUT);
        } else {
            $timerStore.setKey("presenceCheckTimeout", timeout);
        }
        return; // don't tick timer down while checking presence
    }

    if (state.timeLeft > 0) {
      $timerStore.setKey("timeLeft", state.timeLeft - 1);
    } else {
      handlePhaseComplete();
    }
  }, 1000);
};

export const pauseTimer = () => {
  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  $timerStore.setKey("isActive", false);
};

export const stopTimer = () => {
  pauseTimer();
  $timerStore.set({
    ...$timerStore.get(),
    mode: "idle",
    timeLeft: WORK_TIME,
    activeEvent: null,
    showPresenceCheck: false,
    presenceCheckTimeout: PRESENCE_TIMEOUT,
  });
  lastPresenceCheck = 0;
};

export const handlePhaseComplete = () => {
  const currentMode = $timerStore.get().mode;
  if (currentMode === "focus") {
    // Notify firestore to increment stats here
    $timerStore.setKey(
      "pomodorosCompletedToday",
      $timerStore.get().pomodorosCompletedToday + 1
    );
    $timerStore.setKey("mode", "break");
    $timerStore.setKey("timeLeft", BREAK_TIME);
  } else if (currentMode === "break") {
    $timerStore.setKey("mode", "focus");
    $timerStore.setKey("timeLeft", WORK_TIME);
  }
};

export const confirmPresence = () => {
    $timerStore.setKey("showPresenceCheck", false);
    $timerStore.setKey("presenceCheckTimeout", PRESENCE_TIMEOUT);
};

export const setTimerFromEvent = (event: CalendarEvent | null) => {
    if (!event) return;
    $timerStore.setKey("activeEvent", event);
    // Simple auto-splitter logic
    // We compute the elapsed time in the event
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - event.start.getTime()) / 1000);
    
    // Total cycle is 30 mins
    const CYCLE_TIME = WORK_TIME + BREAK_TIME;
    const currentSplitSeconds = elapsedSeconds % CYCLE_TIME;

    if (currentSplitSeconds < WORK_TIME) {
        $timerStore.setKey("mode", "focus");
        $timerStore.setKey("timeLeft", WORK_TIME - currentSplitSeconds);
    } else {
        $timerStore.setKey("mode", "break");
        $timerStore.setKey("timeLeft", CYCLE_TIME - currentSplitSeconds);
    }
}
