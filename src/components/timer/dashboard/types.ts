import { type CalendarEvent } from "../../../lib/calendar";

export interface ManualTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface DashboardProps {
  manualTasks: ManualTask[];
  events: CalendarEvent[];
}
