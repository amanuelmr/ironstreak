import { Loader2, Plus } from "lucide-react";
import { FormEvent, useState } from "react";

import { useGoal } from "../hooks/useGoal";
import { useGoalMutation } from "../hooks/useGoalMutation";
import { PanelHeading } from "./PanelHeading";

export function GoalPanel() {
  const goalQuery = useGoal();
  const goalMutation = useGoalMutation();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const goal = goalQuery.data;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const description = String(data.get("description") || "").trim();

    if (!title) {
      setMessage("Activity is required.");
      setIsError(true);
      return;
    }

    setMessage("");
    setIsError(false);
    goalMutation.mutate(
      { title, description: description || null },
      {
        onSuccess: () => {
          form.reset();
          setMessage("Goal set.");
          setIsError(false);
        },
        onError: (error) => {
          setMessage(error instanceof Error ? error.message : "Could not save goal.");
          setIsError(true);
        },
      },
    );
  }

  return (
    <section className="tool-panel">
      <PanelHeading eyebrow="Commitment" title="Daily activity" />
      {goal && (
        <div className="current-goal">
          <strong>{goal.title}</strong>
          {goal.description && <p>{goal.description}</p>}
        </div>
      )}
      <form className="goal-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{goal ? "Replace activity" : "Activity"}</span>
          <input name="title" type="text" maxLength={200} autoComplete="off" required />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea name="description" rows={3} />
        </label>
        <p className={`form-message ${isError ? "" : "calm"}`}>{message}</p>
        <button className="secondary-button" type="submit" disabled={goalMutation.isPending}>
          {goalMutation.isPending ? (
            <Loader2 size={16} className="spinner" aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          {goalMutation.isPending ? "Saving" : goal ? "Replace goal" : "Set goal"}
        </button>
      </form>
    </section>
  );
}
