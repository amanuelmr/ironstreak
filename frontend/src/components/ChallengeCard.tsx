import { Check, ChevronDown, ChevronRight, Flame, ListPlus, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useChallengeMutations } from "../hooks/useChallengeMutations";
import { formatDate, parseDateOnly } from "../lib/dates";
import type { Challenge } from "../types";
import { ChallengeEntries } from "./ChallengeEntries";
import { ChallengeForm, type ChallengeFormValues } from "./ChallengeForm";

function progressFraction(challenge: Challenge): number {
  if (challenge.status === "completed") return 1;
  const start = parseDateOnly(challenge.start_date).getTime();
  const end = parseDateOnly(challenge.end_date).getTime();
  const total = end - start;
  if (total <= 0) return challenge.is_overdue ? 1 : 0;
  const elapsed = total - challenge.days_remaining * 86_400_000;
  return Math.min(1, Math.max(0, elapsed / total));
}

function remainingLabel(challenge: Challenge): string {
  if (challenge.status === "completed") {
    return challenge.completed_at ? `Completed ${formatDate(challenge.completed_at.slice(0, 10))}` : "Completed";
  }
  if (challenge.days_remaining < 0) return `${Math.abs(challenge.days_remaining)}d overdue`;
  if (challenge.days_remaining === 0) return "Due today";
  return `${challenge.days_remaining}d left`;
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { update, remove } = useChallengeMutations();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editError, setEditError] = useState("");
  const confirmTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current);
  }, []);

  const badge =
    challenge.status === "completed" ? "completed" : challenge.is_overdue ? "overdue" : "active";
  const badgeLabel = badge === "completed" ? "Completed" : badge === "overdue" ? "Overdue" : "Active";

  function handleEditSubmit(values: ChallengeFormValues) {
    setEditError("");
    update.mutate(
      {
        id: challenge.id,
        patch: {
          title: values.title,
          description: values.description || null,
          start_date: values.start_date,
          end_date: values.end_date,
          requires_daily_checkin: values.requires_daily_checkin,
        },
      },
      {
        onSuccess: () => setEditing(false),
        onError: (error) => setEditError(error instanceof Error ? error.message : "Could not save."),
      },
    );
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      confirmTimer.current = window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    remove.mutate(challenge.id);
  }

  if (editing) {
    return (
      <div className="challenge-card editing">
        <ChallengeForm
          initial={{
            title: challenge.title,
            description: challenge.description ?? "",
            start_date: challenge.start_date,
            end_date: challenge.end_date,
            requires_daily_checkin: challenge.requires_daily_checkin,
          }}
          submitLabel={update.isPending ? "Saving…" : "Save changes"}
          pending={update.isPending}
          error={editError}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setEditing(false);
            setEditError("");
          }}
        />
      </div>
    );
  }

  const fraction = progressFraction(challenge);

  return (
    <div className={`challenge-card ${badge}`}>
      <div className="challenge-card-head">
        <button
          type="button"
          className="challenge-expand"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span className="challenge-title">{challenge.title}</span>
        </button>
        <div className="challenge-head-right">
          {challenge.requires_daily_checkin && challenge.status === "active" && (
            <span
              className={`challenge-streak${challenge.current_streak >= 3 ? " hot" : ""}`}
              title={`Daily check-in streak · best ${challenge.best_streak}`}
            >
              <Flame size={13} aria-hidden="true" />
              {challenge.current_streak}
            </span>
          )}
          <span className={`challenge-badge ${badge}`}>{badgeLabel}</span>
        </div>
      </div>

      {challenge.description && <p className="challenge-desc">{challenge.description}</p>}

      <div className="challenge-meta">
        <span>{`${formatDate(challenge.start_date)} → ${formatDate(challenge.end_date)}`}</span>
        <span className="challenge-remaining">{remainingLabel(challenge)}</span>
        <span>{`${challenge.entry_count} ${challenge.entry_count === 1 ? "entry" : "entries"}`}</span>
      </div>

      <div className="challenge-progress" aria-hidden="true">
        <span style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>

      <div className="challenge-actions">
        <button type="button" className="ghost-button" onClick={() => setExpanded((value) => !value)}>
          <ListPlus size={14} aria-hidden="true" />
          Entries
        </button>
        <button type="button" className="ghost-button" onClick={() => setEditing(true)}>
          <Pencil size={14} aria-hidden="true" />
          Edit
        </button>
        {challenge.status === "active" ? (
          <button
            type="button"
            className="ghost-button success"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: challenge.id, patch: { status: "completed" } })}
          >
            <Check size={14} aria-hidden="true" />
            Complete
          </button>
        ) : (
          <button
            type="button"
            className="ghost-button"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: challenge.id, patch: { status: "active" } })}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reopen
          </button>
        )}
        <button
          type="button"
          className={`ghost-button danger ${confirmDelete ? "confirming" : ""}`}
          disabled={remove.isPending}
          onClick={handleDeleteClick}
        >
          {remove.isPending ? (
            <Loader2 size={14} className="spinner" aria-hidden="true" />
          ) : (
            <Trash2 size={14} aria-hidden="true" />
          )}
          {confirmDelete ? "Confirm?" : "Delete"}
        </button>
      </div>

      {expanded && <ChallengeEntries challengeId={challenge.id} />}
    </div>
  );
}
