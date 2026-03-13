import React from "react";
import { type CalendarEvent } from "../../../lib/calendar";

interface TaskItemProps {
  task: CalendarEvent;
  isLarge?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isLarge = false,
}) => {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      className={`flex items-center gap-4 rounded-4xl backdrop-blur-3xl border transition-all duration-300 group relative z-40 ${
        isLarge
          ? "p-7 bg-white/3 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10"
          : "p-4 bg-white/1 border-white/5 hover:bg-white/4 hover:border-white/10"
      }`}>
      <div
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLarge ? "bg-red-500" : "bg-white/20 group-hover:bg-white/50"} transition-colors`}
      />
      <div className="flex-1 min-w-0">
        <h5
          className={`font-black truncate tracking-tight transition-all text-white ${isLarge ? "text-xl" : "text-sm"}`}>
          {task.summary}
        </h5>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 font-mono text-white">
            {formatTime(task.start)} — {formatTime(task.end)}
          </span>
        </div>
      </div>
    </div>
  );
};
