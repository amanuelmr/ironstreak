import { ChevronDown, ChevronRight, Plus, Trophy } from "lucide-react";
import { useState } from "react";

import { useChallengeMutations } from "../hooks/useChallengeMutations";
import { useChallenges } from "../hooks/useChallenges";
import { useOverview } from "../hooks/useOverview";
import { addDays, parseDateOnly, toDateKey } from "../lib/dates";
import { ChallengeCard } from "./ChallengeCard";
import { ChallengeForm, type ChallengeFormValues } from "./ChallengeForm";
import { ErrorState } from "./ErrorState";
import { PanelHeading } from "./PanelHeading";
import { Skeleton } from "./Skeleton";

export function ChallengesPanel() {
  const { data, isPending, isError, refetch } = useChallenges();
  const { create } = useChallengeMutations();
  const overview = useOverview();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const today = overview.data?.server_today ?? toDateKey(new Date());
  const defaultEnd = toDateKey(addDays(parseDateOnly(today), 7));

  const active = (data ?? []).filter((challenge) => challenge.status === "active");
  const completed = (data ?? []).filter((challenge) => challenge.status === "completed");

  function handleCreate(values: ChallengeFormValues) {
    setCreateError("");
    create.mutate(
      {
        title: values.title,
        description: values.description || null,
        start_date: values.start_date,
        end_date: values.end_date,
        requires_daily_checkin: values.requires_daily_checkin,
      },
      {
        onSuccess: () => setCreating(false),
        onError: (error) =>
          setCreateError(error instanceof Error ? error.message : "Could not create challenge."),
      },
    );
  }

  return (
    <section className="tool-panel challenges-panel">
      <PanelHeading
        eyebrow="Your work"
        title="Challenges"
        actions={
          !creating && (
            <button type="button" className="secondary-button" onClick={() => setCreating(true)}>
              <Plus size={15} aria-hidden="true" />
              New challenge
            </button>
          )
        }
      />

      {creating && (
        <ChallengeForm
          initial={{
            title: "",
            description: "",
            start_date: today,
            end_date: defaultEnd,
            requires_daily_checkin: false,
          }}
          submitLabel={create.isPending ? "Creating…" : "Create challenge"}
          pending={create.isPending}
          error={createError}
          onSubmit={handleCreate}
          onCancel={() => {
            setCreating(false);
            setCreateError("");
          }}
        />
      )}

      {isPending ? (
        <div className="skeleton-stack">
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
        </div>
      ) : isError ? (
        <ErrorState message="Could not load challenges." onRetry={() => void refetch()} />
      ) : (
        <>
          {active.length === 0 ? (
            !creating && (
              <p className="challenges-empty">
                No active challenges. Start one to track progress over days or weeks — finish it
                whenever you like.
              </p>
            )
          ) : (
            <div className="challenge-list">
              {active.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="challenge-history">
              <button
                type="button"
                className="history-toggle"
                aria-expanded={showHistory}
                onClick={() => setShowHistory((value) => !value)}
              >
                {showHistory ? (
                  <ChevronDown size={15} aria-hidden="true" />
                ) : (
                  <ChevronRight size={15} aria-hidden="true" />
                )}
                <Trophy size={14} aria-hidden="true" />
                History ({completed.length})
              </button>
              {showHistory && (
                <div className="challenge-list">
                  {completed.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
