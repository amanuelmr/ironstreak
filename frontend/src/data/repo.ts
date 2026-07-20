import { parseDateOnly, toDateKey } from "../lib/dates";
import { computeStreak } from "../lib/streaks";
import type {
  ActivityDay,
  Challenge,
  ChallengeCreatePayload,
  ChallengeDetail,
  ChallengeEntry,
  ChallengeEntryPayload,
  ChallengeStatus,
  ChallengeUpdatePayload,
  Overview,
} from "../types";
import { db, type ChallengeRow, type EntryRow } from "./db";

function todayKey(): string {
  return toDateKey(new Date());
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((parseDateOnly(toKey).getTime() - parseDateOnly(fromKey).getTime()) / 86_400_000);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toEntryOut(row: EntryRow): ChallengeEntry {
  return {
    id: row.id,
    note: row.note,
    link: row.link,
    duration_minutes: row.duration_minutes,
    logged_at: row.logged_at,
  };
}

function serialize(challenge: ChallengeRow, entries: EntryRow[], today: string): Challenge {
  const isOverdue = challenge.status === "active" && challenge.end_date < today;

  let currentStreak = 0;
  let bestStreak = 0;
  if (challenge.requires_daily_checkin) {
    const windowEnd = today < challenge.end_date ? today : challenge.end_date;
    const dates = new Set(
      entries
        .map((entry) => entry.local_date)
        .filter((date) => date >= challenge.start_date && date <= windowEnd),
    );
    [currentStreak, bestStreak] = computeStreak(dates, windowEnd);
  }

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    status: challenge.status,
    requires_daily_checkin: challenge.requires_daily_checkin,
    created_at: challenge.created_at,
    completed_at: challenge.completed_at,
    entry_count: entries.length,
    is_overdue: isOverdue,
    days_remaining: daysBetween(today, challenge.end_date),
    current_streak: currentStreak,
    best_streak: bestStreak,
  };
}

async function entriesFor(challengeId: number): Promise<EntryRow[]> {
  return db.entries.where("challenge_id").equals(challengeId).toArray();
}

export async function getOverview(): Promise<Overview> {
  const today = todayKey();
  const [entries, active, completed] = await Promise.all([
    db.entries.toArray(),
    db.challenges.where("status").equals("active").count(),
    db.challenges.where("status").equals("completed").count(),
  ]);

  const dates = new Set(entries.map((entry) => entry.local_date));
  const [current, longest] = computeStreak(dates, today);
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes ?? 0), 0);

  return {
    current_streak: current,
    longest_streak: longest,
    active_count: active,
    completed_count: completed,
    total_hours_logged: round1(totalMinutes / 60),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    server_today: today,
  };
}

export async function getActivity(days: number): Promise<ActivityDay[]> {
  const today = parseDateOnly(todayKey());
  const cutoff = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)));
  const entries = await db.entries.where("local_date").aboveOrEqual(cutoff).toArray();

  const byDay = new Map<string, { entry_count: number; minutes: number }>();
  for (const entry of entries) {
    const bucket = byDay.get(entry.local_date) ?? { entry_count: 0, minutes: 0 };
    bucket.entry_count += 1;
    bucket.minutes += entry.duration_minutes ?? 0;
    byDay.set(entry.local_date, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, ...bucket }));
}

export async function getChallenges(status?: ChallengeStatus): Promise<Challenge[]> {
  const today = todayKey();
  const rows = status
    ? await db.challenges.where("status").equals(status).toArray()
    : await db.challenges.toArray();
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return Promise.all(rows.map(async (row) => serialize(row, await entriesFor(row.id), today)));
}

export async function getChallenge(id: number): Promise<ChallengeDetail> {
  const challenge = await db.challenges.get(id);
  if (!challenge) throw new Error("Challenge not found.");
  const entries = await entriesFor(id);
  entries.sort((a, b) => b.logged_at.localeCompare(a.logged_at));
  return { ...serialize(challenge, entries, todayKey()), entries: entries.map(toEntryOut) };
}

export async function createChallenge(payload: ChallengeCreatePayload): Promise<Challenge> {
  const today = todayKey();
  const start = payload.start_date || today;
  if (payload.end_date < start) throw new Error("End date must be on or after the start date.");

  const id = await db.challenges.add({
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    start_date: start,
    end_date: payload.end_date,
    status: "active",
    requires_daily_checkin: payload.requires_daily_checkin,
    created_at: new Date().toISOString(),
    completed_at: null,
  } as ChallengeRow);

  const challenge = await db.challenges.get(id);
  return serialize(challenge!, [], today);
}

export async function updateChallenge(id: number, patch: ChallengeUpdatePayload): Promise<Challenge> {
  const challenge = await db.challenges.get(id);
  if (!challenge) throw new Error("Challenge not found.");

  if (patch.title !== undefined) challenge.title = patch.title.trim();
  if (patch.description !== undefined) challenge.description = patch.description?.trim() || null;
  if (patch.start_date !== undefined) challenge.start_date = patch.start_date;
  if (patch.end_date !== undefined) challenge.end_date = patch.end_date;
  if (patch.requires_daily_checkin !== undefined)
    challenge.requires_daily_checkin = patch.requires_daily_checkin;
  if (challenge.end_date < challenge.start_date)
    throw new Error("End date must be on or after the start date.");
  if (patch.status !== undefined && patch.status !== challenge.status) {
    challenge.status = patch.status;
    challenge.completed_at = patch.status === "completed" ? new Date().toISOString() : null;
  }

  await db.challenges.put(challenge);
  return serialize(challenge, await entriesFor(id), todayKey());
}

export async function deleteChallenge(id: number): Promise<void> {
  await db.transaction("rw", db.challenges, db.entries, async () => {
    await db.entries.where("challenge_id").equals(id).delete();
    await db.challenges.delete(id);
  });
}

export async function addChallengeEntry(id: number, payload: ChallengeEntryPayload): Promise<ChallengeEntry> {
  const challenge = await db.challenges.get(id);
  if (!challenge) throw new Error("Challenge not found.");
  const now = new Date();
  const entryId = await db.entries.add({
    challenge_id: id,
    note: payload.note.trim(),
    link: payload.link?.trim() || null,
    duration_minutes: payload.duration_minutes ?? null,
    logged_at: now.toISOString(),
    local_date: toDateKey(now),
  } as EntryRow);
  const entry = await db.entries.get(entryId);
  return toEntryOut(entry!);
}

export async function deleteChallengeEntry(id: number, entryId: number): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry || entry.challenge_id !== id) throw new Error("Entry not found.");
  await db.entries.delete(entryId);
}

// --- backup / restore (options page) ---

export type Backup = {
  schemaVersion: 1;
  exported_at: string;
  challenges: ChallengeRow[];
  entries: EntryRow[];
};

export async function exportData(): Promise<Backup> {
  const [challenges, entries] = await Promise.all([db.challenges.toArray(), db.entries.toArray()]);
  return { schemaVersion: 1, exported_at: new Date().toISOString(), challenges, entries };
}

export async function importData(backup: Backup): Promise<void> {
  if (backup?.schemaVersion !== 1 || !Array.isArray(backup.challenges) || !Array.isArray(backup.entries)) {
    throw new Error("Not a valid Ironstreak backup file.");
  }
  await db.transaction("rw", db.challenges, db.entries, async () => {
    await db.challenges.clear();
    await db.entries.clear();
    await db.challenges.bulkAdd(backup.challenges);
    await db.entries.bulkAdd(backup.entries);
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.challenges, db.entries, async () => {
    await db.challenges.clear();
    await db.entries.clear();
  });
}
