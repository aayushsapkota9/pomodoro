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
    isGuest,
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
    if (isGuest) {
      setEvents([]);
      return;
    }
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
  }, [calendarAccessToken, isGuest]);

  // Sync Manual Tasks (Firestore or Local Storage)
  useEffect(() => {
    if (isGuest) {
      const storedTasks = localStorage.getItem("guest_manual_tasks");
      if (storedTasks) {
        setManualTasks(JSON.parse(storedTasks));
      } else {
        setManualTasks([]);
      }
      return;
    }

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
  }, [user?.uid, isGuest]);

  // Clock Calibration (NTP-lite)
  useEffect(() => {
    if (user?.uid && !isGuest) {
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
  }, [user?.uid, isGuest]);

  // Sync Timer State across devices (Receiver)
  useEffect(() => {
    if (isGuest) {
        $timerStore.setKey("hasSyncedOnce", true);
        return;
    }
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
  }, [user?.uid, isGuest]);

  // Broadcast Timer State changes (Sender)
  useEffect(() => {
    if (!user?.uid || isGuest) return;
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
  }, [user?.uid, isGuest]);

  // Sync events to store for auto-start heartbeat
  useEffect(() => {
    import("../../stores/timerStore").then(({ setEvents }) => {
      setEvents(events);
    });
  }, [events]);

  const addManualTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTaskText.trim()) return;

    if (isGuest) {
      const newTask: ManualTask = {
        id: Math.random().toString(36).substring(2, 11),
        text: newTaskText.trim(),
        completed: false,
        createdAt: Date.now(),
      };
      const updatedTasks = [newTask, ...manualTasks];
      setManualTasks(updatedTasks);
      localStorage.setItem("guest_manual_tasks", JSON.stringify(updatedTasks));
      setNewTaskText("");
      return;
    }

    if (!user) return;
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
    if (isGuest) {
        const updatedTasks = manualTasks.map(task => 
            task.id === taskId ? { ...task, completed: !currentStatus } : task
        );
        setManualTasks(updatedTasks);
        localStorage.setItem("guest_manual_tasks", JSON.stringify(updatedTasks));
        return;
    }

    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "manual_tasks", taskId);
      await setDoc(docRef, { completed: !currentStatus }, { merge: true });
    } catch (err) {
      console.error("Manual Tasks: Toggle failed", err);
    }
  };

  const deleteManualTask = async (taskId: string) => {
    if (isGuest) {
        const updatedTasks = manualTasks.filter(task => task.id !== taskId);
        setManualTasks(updatedTasks);
        localStorage.setItem("guest_manual_tasks", JSON.stringify(updatedTasks));
        return;
    }

    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid, "manual_tasks", taskId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Manual Tasks: Delete failed", err);
    }
  };

  const handleToggleAutoSync = () => {
    if (isGuest) return; // Feature disabled in guest mode
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
          <p className="text-white/70 font-black tracking-[0.4em] uppercase text-[10px] animate-pulse">
            {isGuest ? "Loading Workspace" : "Syncing Workspace"}
          </p>
        </div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-[#e5e5e5] overflow-hidden relative font-sans">
        {/* Grain/Noise Overlay - Boosted for Chrome Visibility */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />
        
        {/* Background Layer for Continuity - Increased Opacity for Contrast */}
        <div className="absolute inset-0 opacity-60">
          <BackgroundLayer 
            themeMode="immersive" 
            isFocus={false} 
            bgStyle={{ background: "radial-gradient(circle at 50% 50%, #1a1a20 0%, #0a0a0c 100%)" }} 
            transitionKey="editorial-landing-v3" 
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl px-8 flex flex-col items-center">
          {/* Brand Identity */}
          <div className="absolute top-12 left-12 flex items-center gap-4 opacity-80 animate-in fade-in duration-1000">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shadow-2xl bg-white/5 p-1.5 backdrop-blur-sm">
              <img src="/favicon.svg" className="w-full h-full object-contain" alt="Logo" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Focus Workspace</span>
          </div>
          <div className="relative flex flex-col items-center mt-12">
            {/* Big Title Overlay */}
            <h1 className="text-[12rem] md:text-[20rem] font-black tracking-[-0.05em] leading-none text-white opacity-[0.03] select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 uppercase italic">
              Focus
            </h1>

            {/* Main Editorial Hero */}
            <div className="relative flex flex-col items-center">
              <div className="flex items-center gap-4 md:gap-4">
                <span className="text-6xl md:text-[10rem] font-bold tracking-tighter text-white animate-in slide-in-from-left-20 duration-1000 uppercase">cl</span>
                
                {/* Physical Clock Hero (Updated Asset) */}
                <div className="relative w-32 h-32 md:w-72 md:h-72 group animate-in zoom-in duration-1000 delay-200">
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-1000" />
                  <img 
                    src="/hero_clock-Photoroom.png" 
                    alt="Mechanical Focus" 
                    className="relative w-full h-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,1)] hover:scale-105 transition-transform duration-1000"
                  />
                </div>

                <span className="text-6xl md:text-[10rem] font-bold tracking-tighter text-white animate-in slide-in-from-right-20 duration-1000 uppercase">ck</span>
              </div>
            </div>
          </div>

          {/* CTA Section (Moved Higher) */}
          <div className="flex flex-col items-center gap-6 mt-12 mb-12 animate-in zoom-in duration-1000 delay-700">
            <button 
              onClick={() => import("../../stores/authStore").then(m => m.loginWithGoogle())} 
              className="group relative flex items-center justify-center w-full min-w-[320px] py-6 bg-white text-black font-black text-xs uppercase tracking-[0.5em] hover:bg-[#e5e5e5] transition-all hover:-translate-y-1 active:scale-95"
            >
              Sign in with Google
            </button>

            <button 
              onClick={() => import("../../stores/authStore").then(m => m.continueAsGuest())} 
              className="w-full min-w-[320px] py-6 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.5em] hover:bg-white/5 transition-all active:scale-95"
            >
              Continue as Guest
            </button>
          </div>

          {/* Bottom Content Layer */}
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-end mb-32">
            <div className="md:col-span-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
              <div className="w-px h-24 bg-white/20 mb-8" />
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                   <h2 className="text-xl font-bold text-white">Focus Engine</h2>
                   <p className="text-white/40 text-[11px] leading-relaxed max-w-70">
                     A refined mechanical environment for deep work, 
                     synchronized with your digital rhythm.
                   </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-6 flex flex-col items-end text-right animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
              <div className="w-px h-24 bg-white/20 mb-8" />
              <div className="flex flex-col gap-2">
                 <h2 className="text-xl font-bold text-white">Auto Sync</h2>
                 <p className="text-white/40 text-[11px] leading-relaxed max-w-70">
                   Auto setup pomodoro based on your Google Calendar.
                 </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full flex justify-center text-[9px] font-black uppercase tracking-[0.3em] opacity-20 items-center gap-6 animate-in fade-in duration-1000 delay-1000">
            <span>Mechanical Heart.</span>
            <span>Digital Soul.</span>
            <span>Focus Workspace.</span>
          </div>
        </div>
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
    <div className="min-h-screen w-screen flex flex-col text-white relative selection:bg-white/20 overflow-x-hidden border-none isolate">
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
          isGuest={isGuest}
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
