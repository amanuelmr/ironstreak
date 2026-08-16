import { parseDateOnly, toDateKey } from "../lib/dates";
import { computeStreak, computeWeeklyStreak } from "../lib/streaks";
import type {
  ActivityDay,
  AiVerdict,
  Challenge,
  ChallengeCreatePayload,
  ChallengeDetail,
  ChallengeEntry,
  ChallengeEntryPayload,
  ChallengeStatus,
  ChallengeUpdatePayload,
  EntryPlausibility,
  Overview,
  ReflectionPayload,
  StreakBreak,
} from "../types";
import { db, type ChallengeRow, type EntryRow, type ReflectionRow } from "./db";

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
    ai: row.ai ?? null,
  };
}

export async function setEntryVerdict(entryId: number, ai: EntryPlausibility): Promise<void> {
  await db.entries.update(entryId, { ai });
}

function serialize(challenge: ChallengeRow, entries: EntryRow[], today: string): Challenge {
  const isOverdue = challenge.status === "active" && challenge.end_date < today;

  let currentStreak = 0;
  let bestStreak = 0;
  if (challenge.checkin_frequency.kind !== "none") {
    const windowEnd = today < challenge.end_date ? today : challenge.end_date;
    const dates = new Set(
      entries
        .map((entry) => entry.local_date)
        .filter((date) => date >= challenge.start_date && date <= windowEnd),
    );
    [currentStreak, bestStreak] =
      challenge.checkin_frequency.kind === "daily"
        ? computeStreak(dates, windowEnd)
        : computeWeeklyStreak(dates, windowEnd, challenge.checkin_frequency.timesPerWeek);
  }

  return {
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    start_date: challenge.start_date,
    end_date: challenge.end_date,
    status: challenge.status,
    checkin_frequency: challenge.checkin_frequency,
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

/**
 * Whether to show the "streak broke" reflection prompt: the iron streak is currently
 * dead (nothing logged today or yesterday) but there's logging history, and the user
 * hasn't already been prompted (or skipped) for today. Never blocks logging — this is
 * purely advisory, same posture as the AI plausibility check.
 */
export async function getStreakBreak(): Promise<StreakBreak | null> {
  const today = todayKey();
  const [entries, promptedToday] = await Promise.all([
    db.entries.toArray(),
    db.reflections.where("local_date").equals(today).count(),
  ]);
  if (promptedToday > 0 || entries.length === 0) return null;

  const dates = new Set(entries.map((entry) => entry.local_date));
  const [current, longest] = computeStreak(dates, today);
  if (current > 0) return null;

  return { local_date: today, longest_streak: longest };
}

export async function submitReflection(payload: ReflectionPayload): Promise<void> {
  await db.reflections.add({
    local_date: payload.local_date,
    what_got_in_the_way: payload.what_got_in_the_way?.trim() || null,
    smallest_next_step: payload.smallest_next_step?.trim() || null,
    skipped: payload.skipped,
    created_at: new Date().toISOString(),
  } as ReflectionRow);
}

export async function getActivity(days: number): Promise<ActivityDay[]> {
  const today = parseDateOnly(todayKey());
  const cutoff = toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)));
  const [entries, challenges] = await Promise.all([
    db.entries.where("local_date").aboveOrEqual(cutoff).toArray(),
    db.challenges.toArray(),
  ]);
  const titleById = new Map(challenges.map((challenge) => [challenge.id, challenge.title]));

  const byDay = new Map<
    string,
    { entry_count: number; minutes: number; challengeIds: Set<number>; verdicts: Partial<Record<AiVerdict, number>> }
  >();
  for (const entry of entries) {
    const bucket = byDay.get(entry.local_date) ?? {
      entry_count: 0,
      minutes: 0,
      challengeIds: new Set<number>(),
      verdicts: {},
    };
    bucket.entry_count += 1;
    bucket.minutes += entry.duration_minutes ?? 0;
    bucket.challengeIds.add(entry.challenge_id);
    if (entry.ai) bucket.verdicts[entry.ai.verdict] = (bucket.verdicts[entry.ai.verdict] ?? 0) + 1;
    byDay.set(entry.local_date, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      entry_count: bucket.entry_count,
      minutes: bucket.minutes,
      challenges: [...bucket.challengeIds].map((id) => titleById.get(id) ?? "Untitled").sort(),
      verdicts: bucket.verdicts,
    }));
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
    checkin_frequency: payload.checkin_frequency,
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
  if (patch.checkin_frequency !== undefined) challenge.checkin_frequency = patch.checkin_frequency;
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

export async function updateChallengeEntry(
  id: number,
  entryId: number,
  payload: ChallengeEntryPayload,
): Promise<ChallengeEntry> {
  const entry = await db.entries.get(entryId);
  if (!entry || entry.challenge_id !== id) throw new Error("Entry not found.");
  await db.entries.update(entryId, {
    note: payload.note.trim(),
    link: payload.link?.trim() || null,
    duration_minutes: payload.duration_minutes ?? null,
    // The claim changed, so any prior AI plausibility verdict no longer applies.
    ai: null,
  });
  const updated = await db.entries.get(entryId);
  return toEntryOut(updated!);
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

export type ImportResult = {
  addedChallenges: number;
  addedEntries: number;
  skippedChallenges: number;
  skippedEntries: number;
};

/**
 * Merges a backup into the current data instead of replacing it: only rows whose id
 * isn't already present locally are added. This keeps a stale/old backup from wiping
 * out data added since it was exported — the only backup path this app has.
 */
export async function importData(backup: Backup): Promise<ImportResult> {
  if (backup?.schemaVersion !== 1 || !Array.isArray(backup.challenges) || !Array.isArray(backup.entries)) {
    throw new Error("Not a valid Ironstreak backup file.");
  }
  return db.transaction("rw", db.challenges, db.entries, async () => {
    const existingChallengeIds = new Set(await db.challenges.toCollection().primaryKeys());
    const existingEntryIds = new Set(await db.entries.toCollection().primaryKeys());
    const newChallenges = backup.challenges.filter((c) => !existingChallengeIds.has(c.id));
    const newEntries = backup.entries.filter((e) => !existingEntryIds.has(e.id));

    if (newChallenges.length) await db.challenges.bulkAdd(newChallenges);
    if (newEntries.length) await db.entries.bulkAdd(newEntries);

    return {
      addedChallenges: newChallenges.length,
      addedEntries: newEntries.length,
      skippedChallenges: backup.challenges.length - newChallenges.length,
      skippedEntries: backup.entries.length - newEntries.length,
    };
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.challenges, db.entries, async () => {
    await db.challenges.clear();
    await db.entries.clear();
  });
}
