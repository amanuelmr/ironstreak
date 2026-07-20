import Dexie, { type EntityTable } from "dexie";

import type { ChallengeStatus } from "../types";

export type ChallengeRow = {
  id: number;
  title: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: ChallengeStatus;
  requires_daily_checkin: boolean;
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
};

export const db = new Dexie("ironstreak") as Dexie & {
  challenges: EntityTable<ChallengeRow, "id">;
  entries: EntityTable<EntryRow, "id">;
};

db.version(1).stores({
  challenges: "++id, status",
  entries: "++id, challenge_id, local_date",
});
