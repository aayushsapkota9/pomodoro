import React, { useEffect } from "react";
import { useStore } from "@nanostores/react";
import {
  $timerStore,
  startTimer,
  pauseTimer,
  stopTimer,
  confirmPresence,
  setTimerFromEvent,
} from "../../stores/timerStore";
import { $authStore } from "../../stores/authStore";
import { fetchTodayEvents, getActiveEvent } from "../../lib/calendar";

export const TimerApp: React.FC = () => {
  const { mode, timeLeft, isActive, showPresenceCheck, presenceCheckTimeout } =
    useStore($timerStore);
  const { calendarAccessToken } = useStore($authStore);

  // Sync with calendar event initially
  useEffect(() => {
    if (calendarAccessToken) {
      fetchTodayEvents(calendarAccessToken).then((events) => {
        const active = getActiveEvent(events);
        if (active) {
          setTimerFromEvent(active);
        }
      });
    }
  }, [calendarAccessToken]);

    
  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      className="relative w-full flex flex-col items-center justify-center"
    >
      <div className="text-white text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-4 opacity-90 tracking-wide uppercase">
          {mode === "focus" || mode === "idle" ? "Focus" : "Relax"}
        </h2>
        <div className="font-mono text-8xl sm:text-9xl font-bold tracking-tight mb-12 drop-shadow-md">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex justify-center gap-6">
          {!isActive ? (
            <button
              onClick={startTimer}
              className="px-12 py-5 bg-white text-gray-900 rounded-full font-extrabold text-2xl hover:scale-105 transition-transform shadow-xl"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="px-12 py-5 bg-white/20 hover:bg-white/30 text-white rounded-full font-extrabold text-2xl transition-colors backdrop-blur-sm shadow-xl"
            >
              Pause
            </button>
          )}

          <button
            onClick={stopTimer}
            className="px-8 py-4 bg-transparent border-2 border-white/50 hover:border-white text-white rounded-full font-bold text-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {showPresenceCheck && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Are you still there?
            </h3>
            <p className="text-gray-600 mb-6">
              Timer will auto-pause in{" "}
              <span className="font-bold text-red-500">
                {presenceCheckTimeout}s
              </span>
            </p>
            <button
              onClick={confirmPresence}
              className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-colors text-lg"
            >
              Yes, I am working!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
