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
  const { mode, timeLeft, isActive, showPresenceCheck, presenceCheckTimeout, isAutoMode } =
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
      className="relative w-full max-w-screen-sm mx-auto flex flex-col items-center justify-center px-4"
    >
      <div className="text-white text-center w-full">
        <h2 className="text-xl sm:text-4xl font-black mb-2 sm:mb-4 opacity-40 tracking-[0.4em] uppercase">
          {mode === "focus" || mode === "idle" ? "Focus" : "Relax"}
        </h2>
        <div className="font-mono text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter mb-8 sm:mb-12 drop-shadow-2xl tabular-nums">
          {formatTime(timeLeft)}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
          {!isActive ? (
            <button
              onClick={startTimer}
              disabled={isAutoMode}
              className={`w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 rounded-full font-black text-xl sm:text-2xl transition-all shadow-xl active:scale-95 ${
                isAutoMode 
                  ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/10" 
                  : "bg-white text-gray-900 hover:scale-105"
              }`}
            >
              {isAutoMode ? "System Sync" : "Start Timer"}
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              disabled={isAutoMode}
              className={`w-full sm:w-auto px-10 sm:px-12 py-4 sm:py-5 rounded-full font-black text-xl sm:text-2xl transition-all backdrop-blur-md shadow-xl active:scale-95 ${
                isAutoMode 
                  ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/10" 
                  : "bg-white/20 hover:bg-white/30 text-white ring-1 ring-white/20"
              }`}
            >
              {isAutoMode ? "Auto Running" : "Pause Focus"}
            </button>
          )}

          <button
            onClick={stopTimer}
            disabled={isAutoMode && isActive}
            className={`w-full sm:w-auto px-8 py-3 sm:py-4 bg-transparent border-2 rounded-full font-black text-base sm:text-lg transition-all active:scale-95 ${
              isAutoMode && isActive
                ? "border-white/10 text-white/20 cursor-not-allowed"
                : "border-white/30 hover:border-white hover:bg-white/5 text-white"
            }`}
          >
            Reset session
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
