import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $authStore, loginWithGoogle, logout } from "../../stores/authStore";
import { fetchTodayEvents, type CalendarEvent } from "../../lib/calendar";
import { TimerApp } from "./TimerApp";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { $timerStore } from "../../stores/timerStore";

export const TaskDashboard: React.FC = () => {
  const { user, calendarAccessToken } = useStore($authStore);
  const { mode, isAutoMode } = useStore($timerStore);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (calendarAccessToken) {
      fetchTodayEvents(calendarAccessToken).then((fetchedEvents) => {
        setEvents(fetchedEvents);
      });
    }
  }, [calendarAccessToken]);

  // Load completed Tasks from Firestore
  useEffect(() => {
    if (user && events.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const docRef = doc(db, "users", user.uid, "completed_tasks", today);
      getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          setCompletedTasks(docSnap.data());
        }
      });
    }
  }, [user, events]);

  const toggleTaskCompletion = async (taskId: string, currentStatus: boolean) => {
    if (!user) return;
    const newStatus = !currentStatus;
    const updatedTasks = { ...completedTasks, [taskId]: newStatus };
    setCompletedTasks(updatedTasks);
    
    // Save to Firestore
    const today = new Date().toISOString().split("T")[0];
    const docRef = doc(db, "users", user.uid, "completed_tasks", today);
    await setDoc(docRef, updatedTasks, { merge: true });
  };

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white p-10">
        <h2 className="text-4xl font-bold mb-4 tracking-tight">Focus Workspace</h2>
        <p className="text-gray-400 mb-8 max-w-md text-center text-lg">
          Sign in with Google to sync your calendar and start the Pomodoro session.
        </p>
        <button
          onClick={loginWithGoogle}
          className="flex items-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:scale-105 transition-transform"
        >
          Continue with Google
        </button>
      </div>
    );
  }

  const now = new Date();
  const currentTask = events.find(e => now >= e.start && now <= e.end);
  const upcomingTasks = events.filter(e => e.start > now);
  
  // Set global background color
  const bgClass = mode === "focus" || mode === "idle" ? "bg-red-500" : "bg-blue-500";
  
  // Auto Start Logic if Auto mode is enabled
  useEffect(() => {
    if (isAutoMode && currentTask) {
       import("../../stores/timerStore").then(({ setTimerFromEvent, startTimer }) => {
           setTimerFromEvent(currentTask);
           startTimer();
       });
    }
  }, [isAutoMode, currentTask]);

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col transition-colors duration-700 ${bgClass} text-white`}>
      
      {/* Top Bar (Minimal Setup) */}
      <div className="w-full flex justify-between items-center p-6 lg:p-10 absolute top-0 left-0 z-10 pointer-events-none">
         <div className="flex items-center gap-4 pointer-events-auto">
           <img 
             src={user.photoURL || ""} 
             alt="Profile" 
             className="w-12 h-12 rounded-full border-2 border-white/30"
           />
           <div>
             <h3 className="font-bold text-lg leading-tight">{user.displayName}</h3>
             <button 
               onClick={logout}
               className="text-white/70 text-xs hover:text-white underline underline-offset-2 transition-colors mt-1"
             >
               Sign out
             </button>
           </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row w-full items-center justify-center p-6 lg:p-10 relative z-0">
        
        {/* Left Column: Tasks Overlay */}
        <div className="w-full lg:w-1/3 flex flex-col gap-8 lg:pr-10 z-10">
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/20">
            <h2 className="text-2xl font-bold">Tasks</h2>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input 
                type="checkbox" 
                checked={isAutoMode}
                onChange={() => {
                   import("../../stores/timerStore").then(({ $timerStore }) => {
                       $timerStore.setKey("isAutoMode", !isAutoMode);
                   });
                }}
                className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-0 cursor-pointer"
              />
              Auto-Sync Calendar
            </label>
          </div>

          <div>
             <h4 className="text-sm font-extrabold text-white uppercase tracking-widest mb-4 drop-shadow-sm">
               Happening Now
             </h4>
             {currentTask ? (
               <TaskItem 
                  task={currentTask} 
                  isCompleted={completedTasks[currentTask.id] || false}
                  onToggle={() => toggleTaskCompletion(currentTask.id, completedTasks[currentTask.id] || false)}
               />
             ) : (
               <div className="p-4 rounded-3xl bg-black/20 border border-white/20 text-white font-medium text-sm italic shadow-sm">
                 No active event found on calendar right now.
               </div>
             )}
          </div>

          <div>
             <h4 className="text-sm font-extrabold text-white uppercase tracking-widest mb-4 drop-shadow-sm">
               Up Next
             </h4>
             <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {upcomingTasks.length > 0 ? (
                  upcomingTasks.map(task => (
                    <TaskItem 
                        key={task.id} 
                        task={task}
                        isCompleted={completedTasks[task.id] || false}
                        onToggle={() => toggleTaskCompletion(task.id, completedTasks[task.id] || false)}
                    />
                  ))
                ) : (
                  <p className="text-white font-medium italic text-sm p-2">Your calendar is clear.</p>
                )}
             </div>
          </div>

        </div>

        {/* Right Column: Timer App Centered */}
        <div className="w-full lg:w-2/3 flex items-center justify-center mt-10 lg:mt-0 z-10">
          <TimerApp />
        </div>

      </div>

    </div>
  );
};

// Sub-component for minimalist tasks overlay
const TaskItem = ({ 
  task, 
  isCompleted, 
  onToggle 
}: { 
  task: CalendarEvent; 
  isCompleted: boolean; 
  onToggle: () => void;
}) => {
  const formatTime = (date: Date) => 
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex items-start gap-4 p-5 rounded-3xl backdrop-blur-md border transition-all cursor-default shadow-sm ${
        isCompleted ? "bg-black/40 border-white/10 opacity-70" : "bg-black/20 border-white/30 hover:bg-black/30"
    }`}>
      <button 
        onClick={onToggle}
        className={`mt-1 min-w-[28px] w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
          isCompleted ? "bg-white border-white text-black" : "border-white/40 hover:border-white text-transparent"
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      <div className="flex-1">
        <h5 className={`font-bold text-lg drop-shadow-sm ${isCompleted ? "line-through text-white/60" : "text-white"}`}>
          {task.summary}
        </h5>
        <span className="text-sm text-white/90 font-mono mt-1 block tracking-tight font-medium">
          {formatTime(task.start)} - {formatTime(task.end)}
        </span>
      </div>
    </div>
  );
};
