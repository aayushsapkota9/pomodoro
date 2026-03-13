import React from "react";
import { type ManualTask, type DashboardProps } from "./types";
import { ManualTaskItem } from "./ManualTaskItem";
import { TaskItem } from "./TaskItem";
import { loginWithGoogle } from "../../../stores/authStore";

interface TaskSectionProps extends DashboardProps {
  isLoading: boolean;
  fetchError: string | null;
  newTaskText: string;
  setNewTaskText: (val: string) => void;
  addManualTask: (e?: React.FormEvent) => void;
  toggleManualTask: (id: string, completed: boolean) => void;
  deleteManualTask: (id: string) => void;
  isFocus: boolean;
  currentTask: any;
  upcomingTasks: any[];
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  manualTasks,
  isLoading,
  fetchError,
  newTaskText,
  setNewTaskText,
  addManualTask,
  toggleManualTask,
  deleteManualTask,
  isFocus,
  currentTask,
  upcomingTasks,
}) => {
  return (
    <div className="w-full lg:w-87.5 shrink-0 flex flex-col gap-8 relative z-20 order-2 lg:order-1 overflow-y-auto custom-scrollbar max-h-screen pb-20 p-4 lg:p-0">
      {/* Manual Task Input Section */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-blue-500" />
          Focus Todos
        </h4>
        <form onSubmit={addManualTask} className="relative group">
          <input 
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="What are you focusing on?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-12 text-sm font-bold placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all hover:bg-white/10"
          />
          <button 
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-transform"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>

        <div className="space-y-2">
          {manualTasks.length > 0 ? (
            manualTasks.map(task => (
              <ManualTaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => toggleManualTask(task.id, task.completed)}
                onDelete={() => deleteManualTask(task.id)}
              />
            ))
          ) : (
            <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest text-center py-4 px-6 border border-dashed border-white/5 rounded-2xl">
              Your desk is clear
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-white/5 w-full" />

      {/* Google Calendar Events */}
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] flex items-center gap-2">
            <span className={`w-1 h-1 rounded-full ${isFocus ? "bg-red-500" : "bg-blue-500"}`} />
            Today's Schedule
          </h4>
          {isLoading ? (
            <div className="p-3 rounded-2xl bg-white/5 animate-pulse text-white/30 text-xs">
              Fetching...
            </div>
          ) : fetchError ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col gap-3">
              <p className="text-red-400 text-xs font-bold">{fetchError}</p>
              {fetchError.includes("Session expired") && (
                <button 
                  onClick={loginWithGoogle}
                  className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform w-fit"
                >
                  Reconnect Google
                </button>
              )}
            </div>
          ) : currentTask ? (
            <TaskItem task={currentTask} isLarge />
          ) : (
            <div className="p-4 rounded-2xl bg-black/10 border border-white/5 text-white/40 font-medium text-xs italic">
              No active event
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            Up Next
          </h4>
          <div className="space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-16 bg-white/5 animate-pulse rounded-2xl" />
                <div className="h-16 bg-white/5 animate-pulse rounded-2xl" />
              </div>
            ) : upcomingTasks.length > 0 ? (
              upcomingTasks.map((task, index) => {
                const taskDate = task.start.toDateString();
                const prevTaskDate =
                  index > 0
                    ? upcomingTasks[index - 1].start.toDateString()
                    : null;
                const showDateHeader = taskDate !== prevTaskDate;

                const today = new Date().toDateString();
                const tomorrow = new Date(
                  new Date().setDate(new Date().getDate() + 1),
                ).toDateString();

                let dateLabel = task.start.toLocaleDateString([], {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                });
                if (taskDate === today) dateLabel = "Today";
                if (taskDate === tomorrow) dateLabel = "Tomorrow";

                return (
                  <React.Fragment key={task.id}>
                    {showDateHeader && (
                      <div className="pt-4 pb-2 first:pt-0">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.3em] bg-white/5 px-2 py-1 rounded-md">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <TaskItem task={task} />
                  </React.Fragment>
                );
              })
            ) : (
              <p className="text-white/30 font-medium italic text-xs p-2">
                Your calendar is clear.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
