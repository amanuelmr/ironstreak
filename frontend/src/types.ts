export type Theme = "light" | "dark";

export type Overview = {
  current_streak: number;
  longest_streak: number;
  active_count: number;
  completed_count: number;
  total_hours_logged: number;
  timezone: string;
  server_today: string;
};

export type ActivityDay = {
  date: string;
  entry_count: number;
  minutes: number;
};

export type ChallengeStatus = "active" | "completed";

export type Challenge = {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  requires_daily_checkin: boolean;
  created_at: string;
  completed_at: string | null;
  entry_count: number;
  is_overdue: boolean;
  days_remaining: number;
  current_streak: number;
  best_streak: number;
};

export type ChallengeEntry = {
  id: number;
  note: string;
  link: string | null;
  duration_minutes: number | null;
  logged_at: string;
};

export type ChallengeDetail = Challenge & { entries: ChallengeEntry[] };

export type ChallengeCreatePayload = {
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string;
  requires_daily_checkin: boolean;
};

export type ChallengeUpdatePayload = Partial<{
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  requires_daily_checkin: boolean;
}>;

export type ChallengeEntryPayload = {
  note: string;
  link: string | null;
  duration_minutes: number | null;
};
