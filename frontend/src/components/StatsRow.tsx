import { Award, Flame, Hourglass, Percent } from "lucide-react";
import type { ReactNode } from "react";

import { useStats } from "../hooks/useStats";
import { Skeleton } from "./Skeleton";

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

export function StatsRow() {
  const { data: stats, isPending } = useStats();

  if (isPending || !stats) {
    return (
      <section className="stats-row" aria-label="Statistics">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="stat-card" key={index}>
            <Skeleton width="100%" height="3.2rem" />
          </div>
        ))}
      </section>
    );
  }

  const finished = stats.total_submitted_days + stats.total_failed_days;

  return (
    <section className="stats-row" aria-label="Statistics">
      <StatCard
        label="Completion rate"
        value={`${Math.round(stats.completion_rate * 100)}%`}
        sub={`${stats.total_submitted_days} of ${finished} days`}
        icon={<Percent size={16} />}
      />
      <StatCard
        label="Hours logged"
        value={stats.total_hours_logged.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        sub={`${stats.total_minutes_logged.toLocaleString()} minutes`}
        icon={<Hourglass size={16} />}
      />
      <StatCard label="Current streak" value={String(stats.current_streak)} sub="days" icon={<Flame size={16} />} />
      <StatCard label="Best streak" value={String(stats.longest_streak)} sub="days" icon={<Award size={16} />} />
    </section>
  );
}
