import { apiFetch } from "./client";
import type { CheckinPayload, Goal, GoalPayload, ReminderStatus, Stats, Streak, StreakDay } from "../types";

export function getStreak(): Promise<Streak> {
  return apiFetch<Streak>("/api/streak");
}

export function getHistory(days: number): Promise<StreakDay[]> {
  return apiFetch<StreakDay[]>(`/api/history?days=${days}`);
}

export function getToday(): Promise<StreakDay> {
  return apiFetch<StreakDay>("/api/checkin/today");
}

export function getReminderStatus(): Promise<ReminderStatus> {
  return apiFetch<ReminderStatus>("/api/reminder/status");
}

export function getGoal(): Promise<Goal> {
  return apiFetch<Goal>("/api/goal");
}

export function createGoal(payload: GoalPayload): Promise<Goal> {
  return apiFetch<Goal>("/api/goal", { method: "POST", body: JSON.stringify(payload) });
}

export function submitCheckin(payload: CheckinPayload): Promise<StreakDay> {
  return apiFetch<StreakDay>("/api/checkin", { method: "POST", body: JSON.stringify(payload) });
}

export function getStats(): Promise<Stats> {
  return apiFetch<Stats>("/api/stats");
}
