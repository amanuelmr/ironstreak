import Dexie, { type EntityTable } from "dexie";

import type { CheckinFrequency, ChallengeStatus, EntryPlausibility, TimeSource } from "../types";

export type ChallengeRow = {
  id: number;
  title: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: ChallengeStatus;
  checkin_frequency: CheckinFrequency;
  created_at: string; // ISO
  completed_at: string | null; // ISO
};

export type EntryRow = {
  id: number;
  challenge_id: number;
  note: string;
  link: string | null;
  duration_minutes: number | null;
  logged_at: string; // ISO timestamp
  local_date: string; // YYYY-MM-DD in the device's local time — the streak/activity key
  ai?: EntryPlausibility | null; // optional Groq plausibility verdict (advisory)
  time_source?: TimeSource; // absent = "manual", pre-dates this field
};

export type ReflectionRow = {
  id: number;
  local_date: string; // YYYY-MM-DD the break was noticed on — at most one row per date
  what_got_in_the_way: string | null;
  smallest_next_step: string | null;
  skipped: boolean; // true if the user dismissed the prompt without writing anything
  created_at: string; // ISO
};

export const db = new Dexie("ironstreak") as Dexie & {
  challenges: EntityTable<ChallengeRow, "id">;
  entries: EntityTable<EntryRow, "id">;
  reflections: EntityTable<ReflectionRow, "id">;
};

db.version(1).stores({
  challenges: "++id, status",
  entries: "++id, challenge_id, local_date",
});

db.version(2).stores({
  challenges: "++id, status",
  entries: "++id, challenge_id, local_date",
  reflections: "++id, local_date",
});

// requires_daily_checkin: boolean -> checkin_frequency: CheckinFrequency, so a challenge
// can require N-times-per-week check-ins instead of only daily or none.
db.version(3)
  .stores({
    challenges: "++id, status",
    entries: "++id, challenge_id, local_date",
    reflections: "++id, local_date",
  })
  .upgrade(async (tx) => {
    await tx
      .table("challenges")
      .toCollection()
      .modify((row: ChallengeRow & { requires_daily_checkin?: boolean }) => {
        row.checkin_frequency = row.requires_daily_checkin ? { kind: "daily" } : { kind: "none" };
        delete row.requires_daily_checkin;
      });
  });
