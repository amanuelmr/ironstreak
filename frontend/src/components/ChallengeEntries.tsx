import { useQueryClient } from "@tanstack/react-query";
import { Check, Link as LinkIcon, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { qk } from "../api/keys";
import { getOverview, setEntryVerdict } from "../data/repo";
import { useChallenge } from "../hooks/useChallenge";
import { useChallengeMutations } from "../hooks/useChallengeMutations";
import { formatDate, formatTime } from "../lib/dates";
import { fireSubmitConfetti, MILESTONES } from "../lib/confetti";
import { getGroqSettings, judgePlausibility } from "../lib/groq";
import { playChime } from "../lib/sound";
import type { ChallengeEntry } from "../types";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "./Skeleton";

const VERDICT_LABEL: Record<string, string> = {
  on_track: "on track",
  too_short: "seems short",
  too_long: "seems long",
};

export function ChallengeEntries({ challengeId }: { challengeId: number }) {
  const { data, isPending, isError, refetch } = useChallenge(challengeId, true);
  const { addEntry, removeEntry, editEntry } = useChallengeMutations();
  const queryClient = useQueryClient();

  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [minutes, setMinutes] = useState("");
  const [groqOn, setGroqOn] = useState(false);
  const [checking, setChecking] = useState<Set<number>>(new Set());

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

  useEffect(() => {
    void getGroqSettings().then((s) => setGroqOn(s.enabled && !!s.apiKey));
  }, []);

  async function celebrate() {
    const overview = await getOverview();
    fireSubmitConfetti(overview.current_streak);
    if (MILESTONES.has(overview.current_streak)) playChime();
  }

  function startEdit(entry: ChallengeEntry) {
    setEditingId(entry.id);
    setEditNote(entry.note);
    setEditLink(entry.link ?? "");
    setEditMinutes(entry.duration_minutes != null ? String(entry.duration_minutes) : "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSaveEdit(event: FormEvent, entry: ChallengeEntry) {
    event.preventDefault();
    const trimmed = editNote.trim();
    if (!trimmed) return;
    editEntry.mutate(
      {
        id: challengeId,
        entryId: entry.id,
        payload: {
          note: trimmed,
          link: editLink.trim() || null,
          duration_minutes: editMinutes ? Number(editMinutes) : null,
        },
      },
      {
        onSuccess: (updated) => {
          setEditingId(null);
          void runCheck(updated);
        },
      },
    );
  }

  async function runCheck(entry: ChallengeEntry) {
    if (entry.duration_minutes == null) return;
    const settings = await getGroqSettings();
    if (!settings.enabled || !settings.apiKey) return;

    setChecking((prev) => new Set(prev).add(entry.id));
    try {
      const verdict = await judgePlausibility(
        { url: entry.link, note: entry.note, minutes: entry.duration_minutes },
        settings,
      );
      if (verdict) {
        await setEntryVerdict(entry.id, verdict);
        void queryClient.invalidateQueries({ queryKey: qk.challenge(challengeId) });
      }
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    addEntry.mutate(
      {
        id: challengeId,
        payload: {
          note: trimmed,
          link: link.trim() || null,
          duration_minutes: minutes ? Number(minutes) : null,
        },
      },
      {
        onSuccess: (entry) => {
          setNote("");
          setLink("");
          setMinutes("");
          void runCheck(entry); // best-effort AI plausibility check; never blocks
          void celebrate(); // best-effort; never blocks
        },
      },
    );
  }

  return (
    <div className="challenge-entries">
      <form className="entry-add" onSubmit={handleAdd}>
        <input
          className="entry-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Log progress…"
          maxLength={2000}
        />
        <input
          className="entry-link"
          type="url"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="Link (optional)"
        />
        <input
          className="entry-minutes"
          type="number"
          min={1}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          placeholder="min"
          aria-label="Minutes (optional)"
        />
        <button type="submit" className="secondary-button" disabled={addEntry.isPending || !note.trim()}>
          {addEntry.isPending ? (
            <Loader2 size={14} className="spinner" aria-hidden="true" />
          ) : (
            <Plus size={14} aria-hidden="true" />
          )}
          Log
        </button>
      </form>

      {isPending ? (
        <Skeleton width="100%" height="2.4rem" />
      ) : isError ? (
        <ErrorState message="Could not load entries." onRetry={() => void refetch()} />
      ) : data.entries.length === 0 ? (
        <p className="entries-empty">No entries yet — log your first bit of progress.</p>
      ) : (
        <ul className="entry-list">
          {data.entries.map((entry) =>
            editingId === entry.id ? (
              <li className="entry-row" key={entry.id}>
                <form className="entry-edit" onSubmit={(event) => handleSaveEdit(event, entry)}>
                  <input
                    className="entry-note"
                    value={editNote}
                    onChange={(event) => setEditNote(event.target.value)}
                    placeholder="Log progress…"
                    maxLength={2000}
                    autoFocus
                  />
                  <input
                    className="entry-link"
                    type="url"
                    value={editLink}
                    onChange={(event) => setEditLink(event.target.value)}
                    placeholder="Link (optional)"
                  />
                  <input
                    className="entry-minutes"
                    type="number"
                    min={1}
                    value={editMinutes}
                    onChange={(event) => setEditMinutes(event.target.value)}
                    placeholder="min"
                    aria-label="Minutes (optional)"
                  />
                  <div className="entry-edit-actions">
                    <button
                      type="submit"
                      className="icon-button"
                      aria-label="Save entry"
                      disabled={editEntry.isPending || !editNote.trim()}
                    >
                      {editEntry.isPending ? (
                        <Loader2 size={14} className="spinner" aria-hidden="true" />
                      ) : (
                        <Check size={14} aria-hidden="true" />
                      )}
                    </button>
                    <button type="button" className="icon-button" aria-label="Cancel edit" onClick={cancelEdit}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li className="entry-row" key={entry.id}>
                <div className="entry-body">
                  <p className="entry-text">{entry.note}</p>
                  <div className="entry-meta">
                    <span>{`${formatDate(entry.logged_at.slice(0, 10))} · ${formatTime(entry.logged_at)}`}</span>
                    {entry.duration_minutes != null && <span>{entry.duration_minutes} min</span>}
                    {entry.link && (
                      <a href={entry.link} target="_blank" rel="noreferrer">
                        <LinkIcon size={12} aria-hidden="true" />
                        link
                      </a>
                    )}
                    {checking.has(entry.id) ? (
                      <span className="ai-chip checking">
                        <Loader2 size={11} className="spinner" aria-hidden="true" />
                        checking…
                      </span>
                    ) : entry.ai ? (
                      <span
                        className={`ai-chip ${entry.ai.verdict}`}
                        title={`${entry.ai.reason} (est ${entry.ai.estimated_min}–${entry.ai.estimated_max} min)`}
                      >
                        <Sparkles size={11} aria-hidden="true" />
                        {VERDICT_LABEL[entry.ai.verdict]}
                      </span>
                    ) : (
                      groqOn &&
                      entry.duration_minutes != null && (
                        <button type="button" className="ai-chip check-btn" onClick={() => void runCheck(entry)}>
                          <Sparkles size={11} aria-hidden="true" />
                          check time
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="entry-actions">
                  <button
                    type="button"
                    className="entry-edit-btn"
                    aria-label="Edit entry"
                    onClick={() => startEdit(entry)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="entry-delete"
                    aria-label="Delete entry"
                    disabled={removeEntry.isPending}
                    onClick={() => removeEntry.mutate({ id: challengeId, entryId: entry.id })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
