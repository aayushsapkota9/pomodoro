import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $authStore } from "../../stores/authStore";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { $timerStore } from "../../stores/timerStore";

export const StatsDashboard: React.FC = () => {
  const { user } = useStore($authStore);
  const { pomodorosCompletedToday } = useStore($timerStore);
  
  const [syncedToday, setSyncedToday] = useState(0);

  // Read stats from firestore on mount
  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];
      const docRef = doc(db, "users", user.uid, "stats", today);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSyncedToday(data.count || 0);
      }
    };
    fetchStats();
  }, [user]);

  // Sync increment changes back to firestore
  useEffect(() => {
      if (!user || pomodorosCompletedToday === 0) return;
      const syncStats = async () => {
         const total = syncedToday + pomodorosCompletedToday; 
         const today = new Date().toISOString().split("T")[0];
         const docRef = doc(db, "users", user.uid, "stats", today);
         await setDoc(docRef, { count: total, lastUpdated: new Date() }, { merge: true });
         // Visual representation update
         setSyncedToday(total);
         // Reset store counter to 0 since we synced. We normally shouldn't mutate store from here 
         // without an action, but keeping it simple.
         $timerStore.setKey("pomodorosCompletedToday", 0);
      };
      syncStats();
  }, [pomodorosCompletedToday, user]);

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-sm text-center border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Track your Progress</h3>
        <p className="text-gray-500">Sign in with Google to save your completed Pomodoros.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          Completed Today
        </p>
        <p className="text-5xl font-bold tracking-tight text-gray-900">
          {syncedToday}
        </p>
        <p className="text-sm text-gray-400 mt-2">Pomodoros</p>
      </div>
      
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex items-center justify-center">
            <p className="text-gray-500 text-center text-sm">
                Next feature: Compare daily stats to your calendar load!
            </p>
      </div>
    </div>
  );
};
