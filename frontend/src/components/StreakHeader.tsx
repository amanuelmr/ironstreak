import { Award, CheckCircle2, Flame, Hourglass, Layers } from "lucide-react";
import type { ReactNode } from "react";

import { useOverview } from "../hooks/useOverview";
import { Skeleton } from "./Skeleton";

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: ReactNode }) {
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

export function StreakHeader() {
  const { data, isPending } = useOverview();

  if (isPending || !data) {
    return (
      <section className="streak-header">
        <div className="streak-hero">
          <Skeleton width="8rem" height="0.9rem" />
          <Skeleton width="6rem" height="5rem" radius="16px" />
        </div>
        <div className="streak-stats">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="stat-card" key={index}>
              <Skeleton width="100%" height="3rem" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const s = data.current_streak;

  return (
    <section className="streak-header">
      <div className="streak-hero">
        <span className="section-label">
          <Flame size={14} aria-hidden="true" />
          Iron streak
        </span>
        <strong className="streak-numeral">
          {s >= 3 && <Flame className="flame-flicker" size={44} strokeWidth={2.4} aria-hidden="true" />}
          {s}
        </strong>
        <span className="streak-sub">
          {s === 1 ? "day" : "days"} in a row · best {data.longest_streak}
        </span>
      </div>

      <div className="streak-stats">
        <StatCard label="Active" value={String(data.active_count)} sub="challenges" icon={<Layers size={16} />} />
        <StatCard
          label="Completed"
          value={String(data.completed_count)}
          sub="finished"
          icon={<CheckCircle2 size={16} />}
        />
        <StatCard
          label="Hours logged"
          value={data.total_hours_logged.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          sub="all time"
          icon={<Hourglass size={16} />}
        />
        <StatCard
          label="Best streak"
          value={String(data.longest_streak)}
          sub="days"
          icon={<Award size={16} />}
        />
      </div>
    </section>
  );
}
