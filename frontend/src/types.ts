export type DayStatus = "pending" | "submitted" | "failed";

export type Theme = "light" | "dark";

export type Streak = {
  current_streak: number;
  longest_streak: number;
  today_status: DayStatus;
  goal_title: string | null;
  goal_description?: string | null;
  timezone?: string;
  server_today?: string;
};

export type StreakDay = {
  id?: number;
  date: string;
  status: DayStatus;
  proof_link: string | null;
  proof_note: string | null;
  duration_minutes: number | null;
  submitted_at: string | null;
  reminder_count: number;
};

export type ReminderStatus = {
  next_reminder_at: string | null;
  reminders_sent_today: number;
  deadline: string;
};

export type Goal = {
  id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export type Stats = {
  total_submitted_days: number;
  total_failed_days: number;
  completion_rate: number;
  total_minutes_logged: number;
  total_hours_logged: number;
  current_streak: number;
  longest_streak: number;
};

export type CheckinPayload = {
  proof_link: string;
  proof_note: string | null;
  duration_minutes: number;
};

export type GoalPayload = {
  title: string;
  description: string | null;
};
