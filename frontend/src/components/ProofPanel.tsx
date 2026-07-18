import { CalendarDays, CheckCircle2, Clock3, Link as LinkIcon, Loader2, NotebookPen, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";

import { useCheckinMutation } from "../hooks/useCheckinMutation";
import { useGoal } from "../hooks/useGoal";
import { useToday } from "../hooks/useToday";
import { formatDate, formatTime } from "../lib/dates";
import type { StreakDay } from "../types";
import { ErrorState } from "./ErrorState";
import { PanelHeading } from "./PanelHeading";
import { Skeleton } from "./Skeleton";

export function ProofPanel() {
  const todayQuery = useToday();
  const goalQuery = useGoal();
  const hasGoal = Boolean(goalQuery.data);

  return (
    <section className="proof-panel">
      <PanelHeading eyebrow="Submission" title="Proof before midnight" />
      <div className="panel-body">
        {todayQuery.isPending ? (
          <div className="skeleton-stack">
            <Skeleton width="8rem" height="1.6rem" radius="999px" />
            <Skeleton width="100%" height="2.6rem" />
            <Skeleton width="100%" height="6rem" />
            <Skeleton width="9rem" height="2.6rem" radius="999px" />
          </div>
        ) : todayQuery.isError ? (
          <ErrorState message="Could not load today's check-in." onRetry={() => void todayQuery.refetch()} />
        ) : todayQuery.data.status === "submitted" ? (
          <SubmittedProof today={todayQuery.data} />
        ) : todayQuery.data.status === "failed" ? (
          <FailedNotice today={todayQuery.data} />
        ) : (
          <ProofForm today={todayQuery.data} hasGoal={hasGoal} />
        )}
      </div>
    </section>
  );
}

function ProofForm({ today, hasGoal }: { today: StreakDay; hasGoal: boolean }) {
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"link" | "duration" | null>(null);
  const checkin = useCheckinMutation();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const proofLink = String(form.get("proof_link") || "").trim();
    const proofNote = String(form.get("proof_note") || "").trim();
    const durationMinutes = Number(form.get("duration_minutes"));

    if (!proofLink) {
      setError("Proof link is required.");
      setErrorField("link");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes < 60) {
      setError("Duration must be at least 60 minutes.");
      setErrorField("duration");
      return;
    }

    setError("");
    setErrorField(null);
    checkin.mutate(
      { proof_link: proofLink, proof_note: proofNote || null, duration_minutes: durationMinutes },
      {
        onError: (submitError) => {
          setError(submitError instanceof Error ? submitError.message : "Submission failed.");
          setErrorField(null);
        },
      },
    );
  }

  const message = hasGoal ? error : error || "Set an active goal before submitting proof.";

  return (
    <form className="proof-form" onSubmit={handleSubmit} noValidate>
      <div className="today-chip">
        <CalendarDays size={14} aria-hidden="true" />
        {formatDate(today.date)}
      </div>

      <label className="field wide">
        <span>
          <LinkIcon size={14} aria-hidden="true" />
          Proof link
        </span>
        <input
          name="proof_link"
          type="url"
          inputMode="url"
          placeholder="https://..."
          required
          className={errorField === "link" ? "input-error" : undefined}
          onChange={() => errorField === "link" && (setError(""), setErrorField(null))}
        />
      </label>

      <div className="form-pair">
        <label className="field">
          <span>
            <NotebookPen size={14} aria-hidden="true" />
            Note
          </span>
          <textarea name="proof_note" rows={5} placeholder="What did you complete?" />
        </label>
        <label className="field duration-field">
          <span>
            <Clock3 size={14} aria-hidden="true" />
            Minutes
          </span>
          <input
            name="duration_minutes"
            type="number"
            min={60}
            step={1}
            defaultValue={60}
            required
            className={errorField === "duration" ? "input-error" : undefined}
            onChange={() => errorField === "duration" && (setError(""), setErrorField(null))}
          />
          <small>minimum 60</small>
        </label>
      </div>

      <p className="form-message" role={error ? "alert" : undefined}>
        {message}
      </p>
      <button className="primary-button" type="submit" disabled={!hasGoal || checkin.isPending}>
        {checkin.isPending ? (
          <Loader2 size={17} className="spinner" aria-hidden="true" />
        ) : (
          <CheckCircle2 size={17} aria-hidden="true" />
        )}
        {checkin.isPending ? "Submitting" : "Submit proof"}
      </button>
    </form>
  );
}

function SubmittedProof({ today }: { today: StreakDay }) {
  return (
    <div className="result-state submitted">
      <CheckCircle2 size={30} aria-hidden="true" />
      <h3>Proof accepted.</h3>
      <a href={today.proof_link || "#"} target="_blank" rel="noreferrer">
        {today.proof_link}
      </a>
      {today.proof_note && <p className="proof-note">{today.proof_note}</p>}
      <div className="receipt-row">
        <span>{today.duration_minutes} min</span>
        <span>{formatTime(today.submitted_at)}</span>
      </div>
    </div>
  );
}

function FailedNotice({ today }: { today: StreakDay }) {
  return (
    <div className="result-state failed">
      <ShieldAlert size={30} aria-hidden="true" />
      <h3>{formatDate(today.date)} failed.</h3>
      <p>Streak reset to zero. Come back tomorrow.</p>
    </div>
  );
}
