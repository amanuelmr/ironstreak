import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { qk } from "./api/keys";
import { CommitmentPanel } from "./components/CommitmentPanel";
import { ContributionCalendar } from "./components/ContributionCalendar";
import { EmptyStateHero } from "./components/EmptyStateHero";
import { ErrorState } from "./components/ErrorState";
import { GoalPanel } from "./components/GoalPanel";
import { Header, type ApiState } from "./components/Header";
import { ProofPanel } from "./components/ProofPanel";
import { ReminderBanner } from "./components/ReminderBanner";
import { ReminderPanel } from "./components/ReminderPanel";
import { StatsRow } from "./components/StatsRow";
import { useGoal } from "./hooks/useGoal";
import { useNotifications } from "./hooks/useNotifications";
import { useReminderStatus } from "./hooks/useReminderStatus";
import { useStreak } from "./hooks/useStreak";
import { useToday } from "./hooks/useToday";
import { useTheme } from "./hooks/useTheme";
import { formatTime } from "./lib/dates";

export default function App() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const streakQuery = useStreak();
  const todayQuery = useToday();
  const reminderQuery = useReminderStatus();
  const goalQuery = useGoal();
  const notifications = useNotifications(todayQuery.data);

  const [dismissedReminderDate, setDismissedReminderDate] = useState<string | null>(null);

  const today = todayQuery.data;

  // Day rollover: when the server date changes, everything else is stale.
  const lastDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (!today?.date) return;
    if (lastDateRef.current && lastDateRef.current !== today.date) {
      void queryClient.invalidateQueries();
    }
    lastDateRef.current = today.date;
  }, [today?.date, queryClient]);

  const apiState: ApiState =
    streakQuery.isError && todayQuery.isError
      ? "offline"
      : streakQuery.isPending && todayQuery.isPending
        ? "connecting"
        : "online";

  const deadlineCopy = reminderQuery.data?.next_reminder_at
    ? `Next reminder ${formatTime(reminderQuery.data.next_reminder_at)}`
    : "Deadline at midnight";

  const reminderVisible =
    !!today &&
    today.status === "pending" &&
    today.reminder_count > 0 &&
    today.date !== dismissedReminderDate;

  const isFirstRun = goalQuery.data === null;

  return (
    <>
      {reminderVisible && (
        <ReminderBanner onDismiss={() => setDismissedReminderDate(today?.date ?? null)} />
      )}

      <main className="app-shell">
        <Header
          apiState={apiState}
          deadlineCopy={deadlineCopy}
          theme={theme}
          onToggleTheme={toggleTheme}
          notifState={notifications.state}
          onEnableNotifications={() => void notifications.request()}
        />

        {apiState === "offline" ? (
          <div className="offline-panel">
            <ErrorState
              message="Could not reach the Ironstreak API. Is the backend running?"
              onRetry={() => {
                void streakQuery.refetch();
                void todayQuery.refetch();
                void goalQuery.refetch();
              }}
            />
          </div>
        ) : isFirstRun ? (
          <EmptyStateHero />
        ) : (
          <>
            <section className="daily-board" aria-label="Daily accountability dashboard">
              <CommitmentPanel />
              <ProofPanel />
            </section>

            <StatsRow />

            <section className="support-grid">
              <ReminderPanel />
              <GoalPanel />
            </section>

            <ContributionCalendar />
          </>
        )}
      </main>
    </>
  );
}
