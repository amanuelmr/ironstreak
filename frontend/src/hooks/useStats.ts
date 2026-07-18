import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getStats } from "../api/endpoints";
import { qk } from "../api/keys";
import type { Stats, Streak, StreakDay } from "../types";
import { useHistory } from "./useHistory";
import { useStreak } from "./useStreak";

function deriveStats(history: StreakDay[] | undefined, streak: Streak | undefined): Stats | undefined {
  if (!history || !streak) return undefined;
  const submitted = history.filter((day) => day.status === "submitted");
  const failed = history.filter((day) => day.status === "failed");
  const minutes = submitted.reduce((sum, day) => sum + (day.duration_minutes ?? 0), 0);
  const finished = submitted.length + failed.length;
  return {
    total_submitted_days: submitted.length,
    total_failed_days: failed.length,
    completion_rate: finished ? submitted.length / finished : 0,
    total_minutes_logged: minutes,
    total_hours_logged: Math.round((minutes / 60) * 10) / 10,
    current_streak: streak.current_streak,
    longest_streak: streak.longest_streak,
  };
}

/** Server stats, with a client-side derivation as fallback if /api/stats is unavailable. */
export function useStats() {
  const statsQuery = useQuery({ queryKey: qk.stats, queryFn: getStats, retry: false });
  const historyQuery = useHistory();
  const streakQuery = useStreak();

  const fallback = useMemo(
    () => deriveStats(historyQuery.data, streakQuery.data),
    [historyQuery.data, streakQuery.data],
  );

  return {
    data: statsQuery.data ?? (statsQuery.isError ? fallback : undefined),
    isPending: statsQuery.isPending && !fallback,
  };
}
