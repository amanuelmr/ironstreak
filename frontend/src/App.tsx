import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Link as LinkIcon,
  NotebookPen,
  Plus,
  ShieldAlert,
  Target,
  Upload,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = localStorage.getItem("ironstreakApiBase") || import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 90_000;
const REMINDER_TIMES = ["20:00", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"];

type DayStatus = "pending" | "submitted" | "failed";

type Streak = {
  current_streak: number;
  longest_streak: number;
  today_status: DayStatus;
  goal_title: string | null;
};

type StreakDay = {
  id?: number;
  date: string;
  status: DayStatus;
  proof_link: string | null;
  proof_note: string | null;
  duration_minutes: number | null;
  submitted_at: string | null;
  reminder_count: number;
};

type ReminderStatus = {
  next_reminder_at: string | null;
  reminders_sent_today: number;
  deadline: string;
};

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string }>;
};

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & ApiErrorPayload) : (null as T);

  if (!response.ok) {
    throw new Error(detailToString((data as ApiErrorPayload | null)?.detail) || `Request failed: ${response.status}`);
  }

  return data;
}

function detailToString(detail: ApiErrorPayload["detail"]): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  return detail.map((item) => item.msg || "Validation error").join(" ");
}

export default function App() {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [today, setToday] = useState<StreakDay | null>(null);
  const [history, setHistory] = useState<StreakDay[]>([]);
  const [reminder, setReminder] = useState<ReminderStatus | null>(null);
  const [lastReminderCount, setLastReminderCount] = useState<number | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [apiState, setApiState] = useState<"connecting" | "online" | "offline">("connecting");
  const [apiError, setApiError] = useState("");

  const refreshAll = useCallback(async () => {
    try {
      const [streakResponse, historyResponse, todayResponse, reminderResponse] = await Promise.all([
        apiFetch<Streak>("/api/streak"),
        apiFetch<StreakDay[]>("/api/history"),
        apiFetch<StreakDay>("/api/checkin/today"),
        apiFetch<ReminderStatus>("/api/reminder/status"),
      ]);

      setStreak(streakResponse);
      setHistory(historyResponse);
      setToday(todayResponse);
      setReminder(reminderResponse);
      setLastReminderCount((current) => current ?? todayResponse.reminder_count);
      setShowReminder(todayResponse.status === "pending" && todayResponse.reminder_count > 0);
      setApiState("online");
      setApiError("");
    } catch (error) {
      setApiState("offline");
      setApiError(error instanceof Error ? error.message : "Could not reach API.");
    }
  }, []);

  const pollToday = useCallback(async () => {
    try {
      const todayResponse = await apiFetch<StreakDay>("/api/checkin/today");
      const previousCount = lastReminderCount ?? todayResponse.reminder_count;

      setToday(todayResponse);
      setLastReminderCount(todayResponse.reminder_count);
      setApiState("online");
      setApiError("");

      if (todayResponse.status === "submitted") {
        setShowReminder(false);
        await refreshAll();
        return;
      }

      if (todayResponse.status === "pending" && todayResponse.reminder_count > previousCount) {
        setShowReminder(true);
      }
    } catch (error) {
      setApiState("offline");
      setApiError(error instanceof Error ? error.message : "Could not reach API.");
    }
  }, [lastReminderCount, refreshAll]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const poller = window.setInterval(() => {
      void pollToday();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(poller);
  }, [pollToday]);

  const deadlineCopy = reminder?.next_reminder_at
    ? `Next reminder ${formatTime(reminder.next_reminder_at)}`
    : "Deadline at midnight";

  return (
    <>
      {showReminder && (
        <div className="reminder-banner">
          <ShieldAlert size={18} />
          <strong>You haven't submitted proof yet. Submit before midnight.</strong>
        </div>
      )}

      <main className="app-shell">
        <Header apiState={apiState} apiError={apiError} deadlineCopy={deadlineCopy} />

        <section className="daily-board" aria-label="Daily accountability dashboard">
          <CommitmentPanel streak={streak} today={today} />
          <ProofPanel
            today={today}
            hasGoal={Boolean(streak?.goal_title)}
            onSubmitted={async () => {
              setShowReminder(false);
              await refreshAll();
            }}
          />
        </section>

        <section className="support-grid">
          <ReminderPanel today={today} reminder={reminder} />
          <GoalPanel onSaved={refreshAll} />
          <HistoryPanel history={history} />
        </section>
      </main>
    </>
  );
}

function Header({
  apiState,
  apiError,
  deadlineCopy,
}: {
  apiState: "connecting" | "online" | "offline";
  apiError: string;
  deadlineCopy: string;
}) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Flame size={23} strokeWidth={2.4} />
        </div>
        <div>
          <h1>Ironstreak</h1>
          <p>One hour, one proof, every day.</p>
        </div>
      </div>

      <div className="topbar-meta">
        <span className="soft-pill">
          <Clock3 size={15} />
          {deadlineCopy}
        </span>
        <span className={`api-pill ${apiState}`} title={apiError}>
          {apiState}
        </span>
      </div>
    </header>
  );
}

function CommitmentPanel({ streak, today }: { streak: Streak | null; today: StreakDay | null }) {
  const status = today?.status || streak?.today_status || "pending";

  return (
    <section className="commitment-panel">
      <div className="section-label">
        <Target size={16} />
        Today
      </div>
      <h2>{streak?.goal_title || "Set the activity you will protect today."}</h2>
      <p className="date-line">{today ? `${formatLongDate(today.date)} · no grace after midnight` : "Loading today..."}</p>

      <div className="metric-row">
        <div>
          <span>Current streak</span>
          <strong>{streak?.current_streak ?? 0}</strong>
        </div>
        <div>
          <span>Longest</span>
          <strong>{streak?.longest_streak ?? 0}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong className={`status-text ${status}`}>{status}</strong>
        </div>
      </div>
    </section>
  );
}

function ProofPanel({
  today,
  hasGoal,
  onSubmitted,
}: {
  today: StreakDay | null;
  hasGoal: boolean;
  onSubmitted: () => Promise<void>;
}) {
  return (
    <section className="proof-panel">
      <PanelHeading
        eyebrow="Submission"
        title="Proof before midnight"
        icon={<Upload size={18} />}
        status={today?.status || "pending"}
      />
      <div className="panel-body">{renderProofState(today, hasGoal, onSubmitted)}</div>
    </section>
  );
}

function renderProofState(today: StreakDay | null, hasGoal: boolean, onSubmitted: () => Promise<void>) {
  if (!today) {
    return <div className="empty-state">Loading today...</div>;
  }

  if (today.status === "submitted") {
    return <SubmittedState today={today} />;
  }

  if (today.status === "failed") {
    return <FailedState today={today} />;
  }

  return <ProofForm today={today} hasGoal={hasGoal} onSubmitted={onSubmitted} />;
}

function ProofForm({
  today,
  hasGoal,
  onSubmitted,
}: {
  today: StreakDay;
  hasGoal: boolean;
  onSubmitted: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proofLink = String(form.get("proof_link") || "").trim();
    const proofNote = String(form.get("proof_note") || "").trim();
    const durationMinutes = Number(form.get("duration_minutes"));

    if (!proofLink) {
      setError("Proof link is required.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 60) {
      setError("Duration must be at least 60 minutes.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await apiFetch<StreakDay>("/api/checkin", {
        method: "POST",
        body: JSON.stringify({
          proof_link: proofLink,
          proof_note: proofNote || null,
          duration_minutes: durationMinutes,
        }),
      });
      await onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Submission failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="proof-form" onSubmit={handleSubmit}>
      <div className="today-chip">
        <CalendarDays size={15} />
        {formatDate(today.date)}
      </div>

      <label className="field wide">
        <span>
          <LinkIcon size={14} />
          Proof link
        </span>
        <input name="proof_link" type="url" inputMode="url" placeholder="https://..." required />
      </label>

      <div className="form-pair">
        <label className="field">
          <span>
            <NotebookPen size={14} />
            Note
          </span>
          <textarea name="proof_note" rows={5} placeholder="What did you complete?" />
        </label>
        <label className="field duration-field">
          <span>
            <Clock3 size={14} />
            Minutes
          </span>
          <input name="duration_minutes" type="number" min={60} step={1} defaultValue={60} required />
          <small>minimum 60</small>
        </label>
      </div>

      <p className="form-message">{hasGoal ? error : error || "Set an active goal before submitting proof."}</p>
      <button className="primary-button" type="submit" disabled={!hasGoal || isSaving}>
        <CheckCircle2 size={17} />
        {isSaving ? "Submitting" : "Submit proof"}
      </button>
    </form>
  );
}

function SubmittedState({ today }: { today: StreakDay }) {
  return (
    <div className="result-state submitted">
      <CheckCircle2 size={30} />
      <h3>Proof accepted.</h3>
      <a href={today.proof_link || "#"} target="_blank" rel="noreferrer">
        {today.proof_link}
      </a>
      <div className="receipt-row">
        <span>{today.duration_minutes} min</span>
        <span>{formatTime(today.submitted_at)}</span>
      </div>
    </div>
  );
}

function FailedState({ today }: { today: StreakDay }) {
  return (
    <div className="result-state failed">
      <ShieldAlert size={30} />
      <h3>{formatDate(today.date)} failed.</h3>
      <p>Streak reset to zero. Come back tomorrow.</p>
    </div>
  );
}

function ReminderPanel({ today, reminder }: { today: StreakDay | null; reminder: ReminderStatus | null }) {
  const sent = today?.reminder_count ?? reminder?.reminders_sent_today ?? 0;

  return (
    <section className="tool-panel reminder-panel">
      <PanelHeading eyebrow="Evening" title="Escalation" icon={<Bell size={18} />} />
      <div className="reminder-list">
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
      <div className="deadline-note">
        <span>23:59</span>
        <strong>pending becomes failed</strong>
      </div>
    </section>
  );
}

function GoalPanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!title) {
      setMessage("Activity is required.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await apiFetch("/api/goal", {
        method: "POST",
        body: JSON.stringify({ title, description: description || null }),
      });
      event.currentTarget.reset();
      setMessage("Goal set.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save goal.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="tool-panel">
      <PanelHeading eyebrow="Commitment" title="Daily activity" icon={<Target size={18} />} />
      <form className="goal-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Activity</span>
          <input name="title" type="text" maxLength={200} autoComplete="off" required />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea name="description" rows={3} />
        </label>
        <p className="form-message calm">{message}</p>
        <button className="secondary-button" type="submit" disabled={isSaving}>
          <Plus size={16} />
          {isSaving ? "Saving" : "Set goal"}
        </button>
      </form>
    </section>
  );
}

function HistoryPanel({ history }: { history: StreakDay[] }) {
  const cells = useMemo(() => buildHeatmap(history), [history]);

  return (
    <section className="tool-panel history-panel">
      <PanelHeading eyebrow="Record" title="Last 30 days" icon={<CalendarDays size={18} />} />
      <div className="heatmap" aria-label="30-day history">
        {cells.map((cell) => (
          <div className={`heat-cell ${cell.status}`} title={cell.label} aria-label={cell.label} key={cell.key}>
            {cell.day}
          </div>
        ))}
      </div>
    </section>
  );
}

function PanelHeading({
  eyebrow,
  title,
  icon,
  status,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  status?: DayStatus;
}) {
  return (
    <div className="panel-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className={`heading-icon ${status || ""}`}>{icon}</div>
    </div>
  );
}

function buildHeatmap(history: StreakDay[]) {
  const byDate = new Map(history.map((day) => [day.date, day]));
  const today = startOfLocalDay(new Date());

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (29 - index));
    const key = toDateKey(date);
    const entry = byDate.get(key);
    const status = entry?.status || "empty";

    return {
      key,
      status,
      day: date.getDate(),
      label: `${formatLongDate(key)} · ${status.toUpperCase()}`,
    };
  });
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(parseDateOnly(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(parseDateOnly(value));
}

function formatTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
