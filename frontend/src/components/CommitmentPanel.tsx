import { Flame, Target } from "lucide-react";

import { useGoal } from "../hooks/useGoal";
import { useStreak } from "../hooks/useStreak";
import { useToday } from "../hooks/useToday";
import { formatLongDate } from "../lib/dates";
import { Skeleton } from "./Skeleton";

export function CommitmentPanel() {
  const streakQuery = useStreak();
  const todayQuery = useToday();
  const goalQuery = useGoal();

  const streak = streakQuery.data;
  const today = todayQuery.data;
  const status = today?.status || streak?.today_status || "pending";
  const currentStreak = streak?.current_streak ?? 0;
  const description = goalQuery.data?.description ?? streak?.goal_description;

  if (streakQuery.isPending && todayQuery.isPending) {
    return (
      <section className="commitment-panel">
        <div className="section-label">
          <Target size={14} aria-hidden="true" />
          Today
        </div>
        <div className="skeleton-stack">
          <Skeleton width="70%" height="1.6rem" />
          <Skeleton width="45%" height="0.9rem" />
          <Skeleton width="10rem" height="6rem" radius="16px" />
        </div>
      </section>
    );
  }

  return (
    <section className="commitment-panel">
      <div className="section-label">
        <Target size={14} aria-hidden="true" />
        Today
      </div>
      <h2>{streak?.goal_title || "Set the activity you will protect today."}</h2>
      {description && <p className="goal-description">{description}</p>}
      <p className="date-line">
        {today ? `${formatLongDate(today.date)} · no grace after midnight` : " "}
      </p>

      <div className="metric-row">
        <div className="metric-hero">
          <span>Current streak</span>
          <strong className="streak-numeral">
            {currentStreak >= 3 && (
              <Flame className="flame-flicker" size={40} strokeWidth={2.4} aria-hidden="true" />
            )}
            {currentStreak}
          </strong>
        </div>
        <div className="metric-side">
          <div>
            <span>Longest</span>
            <strong>{streak?.longest_streak ?? 0}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong className={`status-text ${status}`}>{status}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
