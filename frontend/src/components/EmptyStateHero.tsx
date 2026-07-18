import { Flame, Loader2, Plus } from "lucide-react";
import { FormEvent, useState } from "react";

import { useGoalMutation } from "../hooks/useGoalMutation";

export function EmptyStateHero() {
  const goalMutation = useGoalMutation();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim();
    const description = String(data.get("description") || "").trim();

    if (!title) {
      setError("Give the commitment a name.");
      return;
    }

    setError("");
    goalMutation.mutate(
      { title, description: description || null },
      {
        onError: (mutationError) => {
          setError(mutationError instanceof Error ? mutationError.message : "Could not save goal.");
        },
      },
    );
  }

  return (
    <section className="empty-hero">
      <div className="empty-hero-mark" aria-hidden="true">
        <Flame size={34} strokeWidth={2.2} />
      </div>
      <h2>One commitment. Every day. No mercy.</h2>
      <p>
        Pick one activity worth at least an hour a day. Submit proof before midnight or the streak
        resets to zero.
      </p>

      <form className="goal-form empty-hero-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Daily activity</span>
          <input
            name="title"
            type="text"
            maxLength={200}
            autoComplete="off"
            placeholder="e.g. Write for one hour"
            required
          />
        </label>
        <label className="field">
          <span>Description (optional)</span>
          <textarea name="description" rows={2} placeholder="What counts, what doesn't" />
        </label>
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={goalMutation.isPending}>
          {goalMutation.isPending ? (
            <Loader2 size={17} className="spinner" aria-hidden="true" />
          ) : (
            <Plus size={17} aria-hidden="true" />
          )}
          {goalMutation.isPending ? "Saving" : "Start the streak"}
        </button>
      </form>
    </section>
  );
}
