import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

import type { CheckinFrequency } from "../types";

export type ChallengeFormValues = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  checkin_frequency: CheckinFrequency;
};

const DEFAULT_TIMES_PER_WEEK = 3;

export function ChallengeForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial: ChallengeFormValues;
  submitLabel: string;
  pending: boolean;
  error?: string;
  onSubmit: (values: ChallengeFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState("");

  function set(key: "title" | "description" | "start_date" | "end_date", value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const title = values.title.trim();
    if (!title) {
      setLocalError("Title is required.");
      return;
    }
    if (values.end_date < values.start_date) {
      setLocalError("End date must be on or after the start date.");
      return;
    }
    setLocalError("");
    onSubmit({ ...values, title, description: values.description.trim() });
  }

  return (
    <form className="challenge-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Title</span>
        <input
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          maxLength={200}
          autoComplete="off"
          placeholder="e.g. Learn Rust"
          required
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          rows={2}
          placeholder="What counts as progress?"
        />
      </label>
      <div className="form-pair">
        <label className="field">
          <span>Start</span>
          <input
            type="date"
            value={values.start_date}
            onChange={(event) => set("start_date", event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>End</span>
          <input
            type="date"
            value={values.end_date}
            min={values.start_date}
            onChange={(event) => set("end_date", event.target.value)}
            required
          />
        </label>
      </div>
      <div className="field checkin-frequency">
        <span>Check-in streak</span>
        <div className="checkin-frequency-options">
          <label className="radio-pill">
            <input
              type="radio"
              name="checkin-frequency"
              checked={values.checkin_frequency.kind === "none"}
              onChange={() => setValues((current) => ({ ...current, checkin_frequency: { kind: "none" } }))}
            />
            <span>None</span>
          </label>
          <label className="radio-pill">
            <input
              type="radio"
              name="checkin-frequency"
              checked={values.checkin_frequency.kind === "daily"}
              onChange={() => setValues((current) => ({ ...current, checkin_frequency: { kind: "daily" } }))}
            />
            <span>Daily</span>
          </label>
          <label className="radio-pill">
            <input
              type="radio"
              name="checkin-frequency"
              checked={values.checkin_frequency.kind === "weekly"}
              onChange={() =>
                setValues((current) => ({
                  ...current,
                  checkin_frequency: {
                    kind: "weekly",
                    timesPerWeek:
                      current.checkin_frequency.kind === "weekly"
                        ? current.checkin_frequency.timesPerWeek
                        : DEFAULT_TIMES_PER_WEEK,
                  },
                }))
              }
            />
            <span>
              {values.checkin_frequency.kind === "weekly" ? (
                <>
                  <input
                    type="number"
                    className="times-per-week"
                    min={1}
                    max={7}
                    value={values.checkin_frequency.timesPerWeek}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        checkin_frequency: {
                          kind: "weekly",
                          timesPerWeek: Math.max(1, Math.min(7, Number(event.target.value) || 1)),
                        },
                      }))
                    }
                  />
                  ×/week
                </>
              ) : (
                "N times/week"
              )}
            </span>
          </label>
        </div>
        <small>Track a per-challenge streak alongside the global one — none, every day, or a weekly quota.</small>
      </div>

      {(localError || error) && (
        <p className="form-message" role="alert">
          {localError || error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary-button" disabled={pending}>
          {pending && <Loader2 size={16} className="spinner" aria-hidden="true" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
