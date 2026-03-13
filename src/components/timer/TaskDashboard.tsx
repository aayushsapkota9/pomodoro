import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $authStore, logout } from "../../stores/authStore";
import { fetchTodayEvents, type CalendarEvent } from "../../lib/calendar";
import { TimerApp } from "./TimerApp";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, setDoc, collection, query, addDoc, deleteDoc, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { 
  $timerStore, 
  updateTimerStateLocally, 
  getIsSyncingFromRemote, 
  getSessionId, 
  setServerOffset, 
  getSyncedNow 
} from "../../stores/timerStore";

// Refactored Components
import { type ManualTask } from "./dashboard/types";
import { BackgroundLayer } from "./dashboard/BackgroundLayer";
import { ProfileMenu } from "./dashboard/ProfileMenu";
import { TaskSection } from "./dashboard/TaskSection";
import { ThemeSettingsModal } from "./dashboard/ThemeSettingsModal";

export const TaskDashboard: React.FC = () => {
  const {
    user,
    calendarAccessToken,
    loading: authLoading,
  } = useStore($authStore);
  const { mode, isAutoMode, isActive, themeMode, customFocusBg, customBreakBg, soundEnabled, tickEnabled, volume } = useStore($timerStore);
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Sync Google Calendar Events
  useEffect(() => {
    if (calendarAccessToken) {
      setIsLoading(true);
      setFetchError(null);
      fetchTodayEvents(calendarAccessToken)
        .then((fetchedEvents) => {
          setEvents(fetchedEvents);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Dashboard: Fetch failed", err);
          const errorMessage = err.message || "";
          if (errorMessage.includes("401")) {
            setFetchError("Session expired. Please reconnect your Google account.");
            localStorage.removeItem("calendarAccessToken");
          } else {
            setFetchError(errorMessage || "Failed to fetch calendar");
          }
          setIsLoading(false);
        });
    }
  }, [calendarAccessToken]);

  // Sync Manual Tasks (Firestore)
  useEffect(() => {
    if (user?.uid) {
      const tasksRef = collection(db, "users", user.uid, "manual_tasks");
      const q = query(tasksRef, orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasks: ManualTask[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          tasks.push({
            id: doc.id,
            text: data.text,
            completed: data.completed,
            createdAt: data.createdAt || Date.now(),
          });
        });
        setManualTasks(tasks);
      }, (err) => {
        console.error("Manual Tasks: Sync failed", err);
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Clock Calibration (NTP-lite)
  useEffect(() => {
    if (user?.uid) {
      const calibrateSync = async () => {
        const start = Date.now();
        const calibrationRef = doc(db, "users", user.uid, "settings", "calibration");
        await setDoc(calibrationRef, { timestamp: serverTimestamp() });
        const snap = await getDoc(calibrationRef);
        if (snap.exists()) {
          const serverTime = snap.data().timestamp.toMillis();
          const rtt = Date.now() - start;
          const offset = (Date.now() - (serverTime + rtt / 2));
          console.log("Timer Sync: Clock calibrated. Offset (ms):", offset);
          setServerOffset(offset);
        }
      };
      calibrateSync();
    }
  }, [user?.uid]);

  // Sync Timer State across devices (Receiver)
  useEffect(() => {
    if (user?.uid) {
      const timerRef = doc(db, "users", user.uid, "settings", "timer");
      const unsubscribe = onSnapshot(timerRef, (docSnap) => {
        if (docSnap.exists()) {
          const remoteState = docSnap.data();
          if (remoteState.lastUpdatedBy === getSessionId()) {
            if (!$timerStore.get().hasSyncedOnce) {
               $timerStore.setKey("hasSyncedOnce", true);
            }
            return;
          }
          updateTimerStateLocally({
            mode: remoteState.mode,
            isActive: remoteState.isActive,
            timeLeft: remoteState.timeLeft,
            lastUpdatedTimestamp: remoteState.lastUpdatedTimestamp
          });
        } else {
          $timerStore.setKey("hasSyncedOnce", true);
        }
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Broadcast Timer State changes (Sender)
  useEffect(() => {
    if (!user?.uid) return;
    let lastKnownIsActive = $timerStore.get().isActive;
    let lastKnownMode = $timerStore.get().mode;

    const unsubscribe = $timerStore.subscribe((state) => {
      if (!state.hasSyncedOnce) return;
      const hasStateChanged = state.isActive !== lastKnownIsActive || state.mode !== lastKnownMode;
      if (!getIsSyncingFromRemote() && hasStateChanged) {
        lastKnownIsActive = state.isActive;
        lastKnownMode = state.mode;
        const timerRef = doc(db, "users", user.uid, "settings", "timer");
        setDoc(timerRef, {
          mode: state.mode,
          isActive: state.isActive,
          timeLeft: state.timeLeft,
          lastUpdatedTimestamp: getSyncedNow(),
          lastUpdatedBy: getSessionId()
        }, { merge: true }).catch(err => console.error("Timer Sync: Broadcast failed", err));
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Sync events to store for auto-start heartbeat
  useEffect(() => {
    import("../../stores/timerStore").then(({ setEvents }) => {
      setEvents(events);
    });
  }, [events]);

  const addManualTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim() || !user) return;
    try {
      const tasksRef = collection(db, "users", user.uid, "manual_tasks");
      await addDoc(tasksRef, {
        text: newTaskText.trim(),
        completed: false,
        createdAt: Date.now(),
      });
      setNewTaskText("");
    } catch (err) {
      console.error("Manual Tasks: Add failed", err);
    }
  };

  const toggleManualTask = async (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "manual_tasks", taskId);
      await setDoc(docRef, { completed: !currentStatus }, { merge: true });
    } catch (err) {
      console.error("Manual Tasks: Toggle failed", err);
    }
  };

  const deleteManualTask = async (taskId: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "manual_tasks", taskId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Manual Tasks: Delete failed", err);
    }
  };

  const handleToggleAutoSync = () => {
    const newVal = !isAutoMode;
    $timerStore.setKey("isAutoMode", newVal);
    window.localStorage.setItem("isAutoMode", String(newVal));
  };

  const handleSoundSetting = (key: any, val: any) => {
    import("../../stores/timerStore").then(({ updateSoundSetting }) => {
      updateSoundSetting(key, val);
    });
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white">
        <div className="flex flex-col items-center gap-8">
          <div className="relative w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center shadow-2xl bg-white/5 backdrop-blur-md">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-0.5 h-2 bg-white/20 rounded-full" style={{ transform: `rotate(${i * 30}deg) translateY(-32px)` }} />
            ))}
            <div className="absolute inset-0 flex items-center justify-center animate-clock-hand">
              <div className="w-1 h-8 bg-white/80 rounded-full -translate-y-4" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center animate-clock-hand-fast">
              <div className="w-1 h-6 bg-white/40 rounded-full -translate-y-3" />
            </div>
            <div className="w-2 h-2 bg-white rounded-full z-10 shadow-lg" />
          </div>
          <p className="text-white/70 font-black tracking-[0.4em] uppercase text-[10px] animate-pulse">Syncing Workspace</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#020617] text-white p-10">
        <h2 className="text-4xl font-bold mb-4 tracking-tight">Focus Workspace</h2>
        <p className="text-gray-400 mb-8 max-w-md text-center text-lg">Sign in with Google to sync your calendar and start the Pomodoro session.</p>
        <button onClick={() => import("../../stores/authStore").then(m => m.loginWithGoogle())} className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:scale-105 transition-transform">
          Continue with Google
        </button>
      </div>
    );
  }

  const now = new Date();
  const currentTask = events.find((e) => now >= e.start && now <= e.end);
  const upcomingTasks = events.filter((e) => e.start > now).sort((a, b) => a.start.getTime() - b.start.getTime());
  const isFocus = (mode === "focus" || mode === "idle") && isActive;

  // Background Style Calculation
  let bgStyle: React.CSSProperties = {};
  if (themeMode === "immersive") {
    bgStyle = isFocus
      ? { background: "radial-gradient(circle at 0% 0%, #450a0a 0%, transparent 60%), radial-gradient(circle at 100% 100%, #7f1d1d 0%, transparent 60%), radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)" }
      : { background: "radial-gradient(circle at 0% 0%, #1e1b4b 0%, transparent 60%), radial-gradient(circle at 100% 100%, #1e3a8a 0%, transparent 60%), radial-gradient(circle at 50% 50%, #020617 0%, #000000 100%)" };
  } else if (themeMode === "minimal") {
    bgStyle = isFocus ? { backgroundColor: "#f87171" } : { backgroundColor: "#475569" };
  } else if (themeMode === "custom") {
    const img = isFocus ? customFocusBg : customBreakBg || customFocusBg;
    if (img) {
      bgStyle = { backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${img})`, backgroundSize: "cover", backgroundPosition: "center" };
    } else {
      bgStyle = { backgroundColor: "#111827" };
    }
  }

  const transitionKey = `${themeMode}-${isFocus}-${isFocus ? customFocusBg : customBreakBg || customFocusBg}`;

  return (
    <div className="min-h-screen w-screen flex flex-col text-white relative selection:bg-white/20 overflow-x-hidden">
      <BackgroundLayer themeMode={themeMode} isFocus={isFocus} bgStyle={bgStyle} transitionKey={transitionKey} />

      <div className="relative z-10 flex flex-col min-h-screen w-full transform-gpu translate-z-0">
        <ProfileMenu 
          user={user}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
          isAutoMode={isAutoMode}
          handleToggleAutoSync={handleToggleAutoSync}
          setIsThemeModalOpen={setIsThemeModalOpen}
          themeMode={themeMode}
          soundEnabled={soundEnabled}
          handleSoundSetting={handleSoundSetting}
          tickEnabled={tickEnabled}
          volume={volume}
          logout={logout}
        />

        <div className="flex-1 flex flex-col lg:flex-row w-full items-start p-4 lg:p-8 relative z-20 gap-8 lg:gap-12">
          <TaskSection 
            manualTasks={manualTasks}
            events={events}
            isLoading={isLoading}
            fetchError={fetchError}
            newTaskText={newTaskText}
            setNewTaskText={setNewTaskText}
            addManualTask={addManualTask}
            toggleManualTask={toggleManualTask}
            deleteManualTask={deleteManualTask}
            isFocus={isFocus}
            currentTask={currentTask}
            upcomingTasks={upcomingTasks}
          />

          <div className="flex-1 w-full flex items-center justify-center py-12 lg:py-0 min-h-[50vh] lg:min-h-0 order-1 lg:order-2 relative z-30">
            <TimerApp />
          </div>
        </div>

        <ThemeSettingsModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      </div>

      <style>{`
        @keyframes float-reveal { 0% { transform: translateY(20px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: inherit; } }
        @keyframes float-drift { 0%, 100% { transform: translateY(0) rotate(0); } 50% { transform: translateY(-30px) rotate(15deg); } }
        .animate-float-reveal { animation: float-reveal 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards, float-drift 8s ease-in-out infinite alternate 1.5s; }
      `}</style>
    </div>
  );
};
