import { map } from "nanostores";
import type { CalendarEvent } from "../lib/calendar";
import { playTick, playAlarm, setVolume } from "../lib/soundService";

export type TimerMode = "idle" | "focus" | "break";

export interface TimerState {
  mode: TimerMode;
  timeLeft: number; // in seconds
  isActive: boolean;
  activeEvent: CalendarEvent | null;
  allEvents: CalendarEvent[]; // Added to monitor for auto-start
  showPresenceCheck: boolean;
  presenceCheckTimeout: number; // to auto pause if not dismissed
  pomodorosCompletedToday: number;
  isAutoMode: boolean;
  // Sound settings
  soundEnabled: boolean;
  tickEnabled: boolean;
  volume: number; // 0 to 1
  themeMode: "minimal" | "immersive" | "custom";
  customFocusBg: string | null;
  customBreakBg: string | null;
  // Sync metadata
  lastUpdatedBy?: string;
  lastUpdatedTimestamp?: number;
  hasSyncedOnce: boolean;
}

export const WORK_TIME = 25 * 60; // 25 minutes
export const BREAK_TIME = 5 * 60; // 5 minutes
export const PRESENCE_CHECK_INTERVAL = 15 * 60; // 15 minutes
export const PRESENCE_TIMEOUT = 60; // 60 seconds

const getStored = (key: string, fallback: any) => {
  if (typeof window !== "undefined") {
    const val = localStorage.getItem(key);
    if (val === null) return fallback;
    if (typeof fallback === "boolean") return val === "true";
    if (typeof fallback === "number") return parseFloat(val);
    return val;
  }
  return fallback;
};

export const $timerStore = map<TimerState>({
  mode: "idle",
  timeLeft: WORK_TIME,
  isActive: false,
  activeEvent: null,
  allEvents: [],
  showPresenceCheck: false,
  presenceCheckTimeout: PRESENCE_TIMEOUT,
  pomodorosCompletedToday: 0,
  isAutoMode: getStored("isAutoMode", true),
  soundEnabled: getStored("soundEnabled", true),
  tickEnabled: getStored("tickEnabled", false),
  volume: getStored("volume", 0.5),
  themeMode: getStored("themeMode", "immersive"),
  customFocusBg: getStored("customFocusBg", null),
  customBreakBg: getStored("customBreakBg", null),
  hasSyncedOnce: false,
});

// Initialize volume
if (typeof window !== "undefined") {
    setVolume($timerStore.get().volume);
}

// Global flag to prevent broadcast loops
let isSyncingFromRemote = false;
let serverOffset = 0; // Local time - Server time
const sessionId = Math.random().toString(36).substring(2, 11);

export const setSyncingFromRemote = (val: boolean) => {
    isSyncingFromRemote = val;
};

export const getIsSyncingFromRemote = () => isSyncingFromRemote;
export const getSessionId = () => sessionId;

export const setServerOffset = (val: number) => {
    serverOffset = val;
};

export const getSyncedNow = () => Date.now() - serverOffset;

let intervalId: number | null = null;
let lastPresenceCheck = 0;

export const startTimer = () => {
  if (intervalId) return;

  const state = $timerStore.get();
  if (state.soundEnabled) {
    playAlarm(); // Play alert when starting manually or via auto-start
  }

  $timerStore.setKey("isActive", true);
  
  if ($timerStore.get().mode === "idle") {
     $timerStore.setKey("mode", "focus");
  }

  intervalId = window.setInterval(() => {
    const state = $timerStore.get();
    
    // Auto sound: Tick
    if (state.isActive && state.soundEnabled && state.tickEnabled) {
      playTick();
    }

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
        return;
    }

    if (state.timeLeft > 0) {
      $timerStore.setKey("timeLeft", state.timeLeft - 1);
    } else {
      handlePhaseComplete();
    }
  }, 1000);
};

// Helper to update store without loops
export const updateTimerStateLocally = (partialState: Partial<TimerState>) => {
    isSyncingFromRemote = true;
    const currentState = $timerStore.get();
    
    // Sync logic: calculate actual timeLeft based on the remote's timestamp
    let targetTimeLeft = partialState.timeLeft ?? currentState.timeLeft;
    if (partialState.isActive && partialState.lastUpdatedTimestamp) {
        const nowSynced = getSyncedNow();
        // Ensure elapsed time is at least 0 to prevent 25:01 flickers
        const elapsedSinceUpdate = Math.max(0, Math.floor((nowSynced - partialState.lastUpdatedTimestamp) / 1000));
        targetTimeLeft = Math.max(0, targetTimeLeft - elapsedSinceUpdate);
    }

    // Mark as synced
    const finalPartial = { ...partialState, hasSyncedOnce: true };

    // If we are transitioning to active, ensure interval is running
    const targetIsActive = finalPartial.isActive ?? currentState.isActive;
    
    // Force set the state first so pauseTimer/startTimer see the correct isActive
    $timerStore.set({ 
        ...currentState, 
        ...finalPartial, 
        timeLeft: targetTimeLeft,
        isActive: targetIsActive
    });

    if (targetIsActive === true && !intervalId) {
        startTimer();
    } else if (targetIsActive === false && intervalId) {
        pauseTimer(true); // Always obey remote pause
    }

    isSyncingFromRemote = false;
};

export const pauseTimer = (skipAutoCheck = false) => {
  const state = $timerStore.get();
  if (!skipAutoCheck && state.isAutoMode && state.activeEvent) return; // Prevent manual pause in auto mode

  if (intervalId) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  $timerStore.setKey("isActive", false);
};

export const stopTimer = () => {
  const state = $timerStore.get();
  // Allow reset even in auto mode if it's idle, but typically stop should be protected
  if (state.isAutoMode && state.activeEvent) {
     // Optional: could just reset the current split instead of ignoring
     return; 
  }

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
  const state = $timerStore.get();
  
  // Auto sound: Alarm
  if (state.soundEnabled) {
    playAlarm();
  }

  if (state.mode === "focus") {
    $timerStore.setKey("pomodorosCompletedToday", state.pomodorosCompletedToday + 1);
    $timerStore.setKey("mode", "break");
    $timerStore.setKey("timeLeft", BREAK_TIME);
  } else if (state.mode === "break") {
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
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - event.start.getTime()) / 1000);
    const CYCLE_TIME = WORK_TIME + BREAK_TIME;
    const currentSplitSeconds = elapsedSeconds % CYCLE_TIME;

    if (currentSplitSeconds < WORK_TIME) {
        $timerStore.setKey("mode", "focus");
        $timerStore.setKey("timeLeft", WORK_TIME - currentSplitSeconds);
    } else {
        $timerStore.setKey("mode", "break");
        $timerStore.setKey("timeLeft", CYCLE_TIME - currentSplitSeconds);
    }
};

export const updateSoundSetting = (key: keyof TimerState, value: any) => {
    $timerStore.setKey(key as any, value);
    localStorage.setItem(key, String(value));
    if (key === "volume") setVolume(value);
};

export const updateThemeSetting = (key: "themeMode" | "customFocusBg" | "customBreakBg", value: any) => {
    $timerStore.setKey(key, value);
    if (value === null) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, String(value));
    }
};

export const setEvents = (events: CalendarEvent[]) => {
    $timerStore.setKey("allEvents", events);
    
    // Immediate check on sync
    const state = $timerStore.get();
    if (state.isAutoMode) {
        const now = new Date();
        const currentEvent = events.find(e => now >= e.start && now <= e.end);
        if (currentEvent) {
            setTimerFromEvent(currentEvent);
            startTimer();
        }
    }
};
