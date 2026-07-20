import { Link as LinkIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { useChallenge } from "../hooks/useChallenge";
import { useChallengeMutations } from "../hooks/useChallengeMutations";
import { formatDate, formatTime } from "../lib/dates";
import { ErrorState } from "./ErrorState";
import { Skeleton } from "./Skeleton";

export function ChallengeEntries({ challengeId }: { challengeId: number }) {
  const { data, isPending, isError, refetch } = useChallenge(challengeId, true);
  const { addEntry, removeEntry } = useChallengeMutations();

  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [minutes, setMinutes] = useState("");

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
        onSuccess: () => {
          setNote("");
          setLink("");
          setMinutes("");
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
          {data.entries.map((entry) => (
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
                </div>
              </div>
              <button
                type="button"
                className="entry-delete"
                aria-label="Delete entry"
                disabled={removeEntry.isPending}
                onClick={() => removeEntry.mutate({ id: challengeId, entryId: entry.id })}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
