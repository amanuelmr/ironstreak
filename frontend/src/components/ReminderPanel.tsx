import type { CSSProperties } from "react";
import { useState } from "react";

import { SOUND_STORAGE_KEY } from "../hooks/useNotifications";
import { useReminderStatus } from "../hooks/useReminderStatus";
import { useToday } from "../hooks/useToday";
import { PanelHeading } from "./PanelHeading";

// Mirrors REMINDER_TIMES in backend/scheduler.py — keep in sync.
export const REMINDER_TIMES = ["20:00", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"];

export function ReminderPanel() {
  const todayQuery = useToday();
  const reminderQuery = useReminderStatus();
  const today = todayQuery.data;
  const reminder = reminderQuery.data;

  const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_STORAGE_KEY) === "1");

  function toggleSound() {
    setSoundOn((current) => {
      const next = !current;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  const sent = today?.reminder_count ?? reminder?.reminders_sent_today ?? 0;
  const total = REMINDER_TIMES.length;
  const railFraction = total > 0 ? Math.min(sent / (total - 1), 1) : 0;
  const railStyle = { "--rail-progress": `${railFraction * 100}%` } as CSSProperties;

  return (
    <section className="tool-panel reminder-panel">
      <PanelHeading
        eyebrow="Evening"
        title="Escalation"
        actions={
          <label className="sound-toggle">
            <input type="checkbox" checked={soundOn} onChange={toggleSound} />
            Sound
          </label>
        }
      />
      <div className="reminder-list" style={railStyle}>
        {REMINDER_TIMES.map((time, index) => {
          const reminderNumber = index + 1;
          const isSent = reminderNumber <= sent;
          const isNext = today?.status === "pending" && reminderNumber === sent + 1;
          return (
            <div className={`reminder-item ${isSent ? "sent" : ""} ${isNext ? "next" : ""}`} key={time}>
              <span>{time}</span>
              <strong>{isSent ? "sent" : isNext ? "next" : "queued"}</strong>
            </div>
          );
        })}
      </div>
      <p className="deadline-text">
        <span className="mono danger-text">23:59</span> — pending becomes failed.
      </p>
    </section>
  );
}
