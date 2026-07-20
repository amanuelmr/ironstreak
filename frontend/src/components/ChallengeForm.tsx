import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

export type ChallengeFormValues = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  requires_daily_checkin: boolean;
};

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
      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={values.requires_daily_checkin}
          onChange={(event) =>
            setValues((current) => ({ ...current, requires_daily_checkin: event.target.checked }))
          }
        />
        <span>
          Require a daily check-in
          <small>Track a per-challenge streak — log an entry every day to keep it alive.</small>
        </span>
      </label>

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
