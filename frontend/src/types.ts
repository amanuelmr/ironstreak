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
  challenges: string[]; // distinct challenge titles logged that day
  verdicts: Partial<Record<AiVerdict, number>>; // AI plausibility verdict counts among that day's entries
};

export type ChallengeStatus = "active" | "completed";

export type CheckinFrequency = { kind: "none" } | { kind: "daily" } | { kind: "weekly"; timesPerWeek: number };

export type Challenge = {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  checkin_frequency: CheckinFrequency;
  created_at: string;
  completed_at: string | null;
  entry_count: number;
  is_overdue: boolean;
  days_remaining: number;
  current_streak: number;
  best_streak: number;
};

export type AiVerdict = "on_track" | "too_short" | "too_long";

export type EntryPlausibility = {
  verdict: AiVerdict;
  estimated_min: number;
  estimated_max: number;
  reason: string;
};

export type TimeSource = "manual" | "measured";

export type ChallengeEntry = {
  id: number;
  note: string;
  link: string | null;
  duration_minutes: number | null;
  logged_at: string;
  ai: EntryPlausibility | null;
  time_source: TimeSource;
};

export type ChallengeDetail = Challenge & { entries: ChallengeEntry[] };

export type ChallengeCreatePayload = {
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string;
  checkin_frequency: CheckinFrequency;
};

export type ChallengeUpdatePayload = Partial<{
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  checkin_frequency: CheckinFrequency;
}>;

export type ChallengeEntryPayload = {
  note: string;
  link: string | null;
  duration_minutes: number | null;
  time_source?: TimeSource;
};

export type StreakBreak = {
  local_date: string; // today's key — the natural dedupe key for the prompt
  longest_streak: number; // the best run the user had going, for the prompt's copy
};

export type ReflectionPayload = {
  local_date: string;
  what_got_in_the_way: string | null;
  smallest_next_step: string | null;
  skipped: boolean;
};
