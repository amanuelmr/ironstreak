import { ChallengesPanel } from "./components/ChallengesPanel";
import { ContributionCalendar } from "./components/ContributionCalendar";
import { ErrorState } from "./components/ErrorState";
import { Header, type ApiState } from "./components/Header";
import { StreakHeader } from "./components/StreakHeader";
import { useChallenges } from "./hooks/useChallenges";
import { useOverview } from "./hooks/useOverview";
import { useTheme } from "./hooks/useTheme";

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const overviewQuery = useOverview();
  const challengesQuery = useChallenges();

  const apiState: ApiState = overviewQuery.isError
    ? "offline"
    : overviewQuery.isPending
      ? "connecting"
      : "online";

  return (
    <main className="app-shell">
      <Header apiState={apiState} theme={theme} onToggleTheme={toggleTheme} />

      {apiState === "offline" ? (
        <div className="offline-panel">
          <ErrorState
            message="Could not reach the Ironstreak API. Is the backend running?"
            onRetry={() => {
              void overviewQuery.refetch();
              void challengesQuery.refetch();
            }}
          />
        </div>
      ) : (
        <>
          <StreakHeader />
          <ContributionCalendar />
          <ChallengesPanel />
        </>
      )}
    </main>
  );
}
