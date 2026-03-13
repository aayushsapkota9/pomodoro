import React from "react";
import { type ManualTask } from "./types";

interface ManualTaskItemProps {
  task: ManualTask;
  onToggle: () => void;
  onDelete: () => void;
}

export const ManualTaskItem: React.FC<ManualTaskItemProps> = ({ 
  task, 
  onToggle, 
  onDelete 
}) => {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 group transition-all relative z-40 ${task.completed ? "opacity-30 grayscale-[0.5]" : "hover:bg-white/10 hover:border-white/10"}`}>
      <button 
        onClick={onToggle}
        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
          task.completed ? "bg-white border-white text-gray-900" : "border-white/20 hover:border-white/50 text-transparent"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
      
      <span className={`flex-1 text-xs font-bold truncate transition-all ${task.completed ? "line-through" : "text-white"}`}>
        {task.text}
      </span>

      <button 
        onClick={onDelete}
        className="p-1.5 text-white/20 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};
