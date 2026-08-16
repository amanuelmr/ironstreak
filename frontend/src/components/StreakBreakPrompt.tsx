import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { qk } from "../api/keys";
import { submitReflection } from "../data/repo";
import { useStreakBreak } from "../hooks/useStreakBreak";

export function StreakBreakPrompt() {
  const { data } = useStreakBreak();
  const queryClient = useQueryClient();
  const [whatGotInTheWay, setWhatGotInTheWay] = useState("");
  const [smallestNextStep, setSmallestNextStep] = useState("");
  const [pending, setPending] = useState(false);

  if (!data) return null;

  async function dismiss(skipped: boolean) {
    setPending(true);
    try {
      await submitReflection({
        local_date: data!.local_date,
        what_got_in_the_way: skipped ? null : whatGotInTheWay,
        smallest_next_step: skipped ? null : smallestNextStep,
        skipped,
      });
      void queryClient.invalidateQueries({ queryKey: qk.streakBreak });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="tool-panel streak-break-prompt">
      <div className="streak-break-head">
        <p className="streak-break-title">
          Your streak broke{data.longest_streak >= 3 ? ` — you had ${data.longest_streak} days going` : ""}.
        </p>
        <button
          type="button"
          className="icon-button"
          aria-label="Dismiss"
          disabled={pending}
          onClick={() => void dismiss(true)}
        >
          <X size={14} />
        </button>
      </div>
      <p className="streak-break-sub">No judgment — a quick note helps more than the streak number ever did.</p>
      <div className="streak-break-fields">
        <label className="field">
          <span>What got in the way?</span>
          <input
            value={whatGotInTheWay}
            onChange={(event) => setWhatGotInTheWay(event.target.value)}
            placeholder="Optional"
            maxLength={280}
          />
        </label>
        <label className="field">
          <span>Smallest step for today</span>
          <input
            value={smallestNextStep}
            onChange={(event) => setSmallestNextStep(event.target.value)}
            placeholder="Optional"
            maxLength={280}
          />
        </label>
      </div>
      <div className="streak-break-actions">
        <button type="button" className="ghost-button" disabled={pending} onClick={() => void dismiss(true)}>
          Skip
        </button>
        <button type="button" className="secondary-button" disabled={pending} onClick={() => void dismiss(false)}>
          Save reflection
        </button>
      </div>
    </section>
  );
}
