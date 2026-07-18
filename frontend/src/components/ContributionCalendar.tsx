import { useEffect, useMemo, useRef, useState } from "react";

import { useHistory } from "../hooks/useHistory";
import { useToday } from "../hooks/useToday";
import { buildCalendar } from "../lib/calendar";
import type { StreakDay } from "../types";
import { DayDetailPanel } from "./DayDetailPanel";
import { ErrorState } from "./ErrorState";
import { PanelHeading } from "./PanelHeading";
import { Skeleton } from "./Skeleton";

const WEEKS = 26;

export function ContributionCalendar() {
  const todayQuery = useToday();
  const historyQuery = useHistory();
  const [selected, setSelected] = useState<StreakDay | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayKey = todayQuery.data?.date;
  const model = useMemo(
    () => (todayKey ? buildCalendar(historyQuery.data ?? [], todayKey, WEEKS) : null),
    [historyQuery.data, todayKey],
  );

  // Keep the current week visible on narrow screens.
  useEffect(() => {
    const node = scrollRef.current;
    if (node && model) node.scrollLeft = node.scrollWidth;
  }, [model]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <section className="tool-panel history-panel">
      <PanelHeading eyebrow="Record" title="Last 26 weeks" />

      {historyQuery.isError ? (
        <ErrorState message="Could not load history." onRetry={() => void historyQuery.refetch()} />
      ) : !model ? (
        <div className="skeleton-stack">
          <Skeleton width="100%" height="7.5rem" />
        </div>
      ) : (
        <>
          <div className="cal-scroll" ref={scrollRef}>
            <div className="cal-inner">
              <div className="cal-months" aria-hidden="true">
                {model.monthLabels.map((month) => (
                  <span key={`${month.label}-${month.weekIndex}`} style={{ gridColumnStart: month.weekIndex + 1 }}>
                    {month.label}
                  </span>
                ))}
              </div>
              <div className="cal-body">
                <div className="cal-weekdays" aria-hidden="true">
                  {model.weekdayLabels.map((label, index) => (
                    <span key={index}>{label}</span>
                  ))}
                </div>
                <div className="cal-grid" role="grid" aria-label="Daily history, last 26 weeks">
                  {model.weeks.flat().map((cell) =>
                    cell.kind === "future" ? (
                      <span className="cal-cell future" key={cell.key} aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        key={cell.key}
                        className={`cal-cell ${cell.status}${cell.isToday ? " today" : ""}${
                          selected?.date === cell.key ? " selected" : ""
                        }`}
                        data-level={cell.level}
                        aria-label={cell.label}
                        aria-expanded={selected?.date === cell.key}
                        disabled={!cell.day}
                        onClick={() =>
                          setSelected((current) => (current?.date === cell.key ? null : cell.day))
                        }
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="cal-legend" aria-hidden="true">
            <span className="legend-ramp">
              Less
              {[0, 2, 3, 4].map((level) => (
                <i key={level} data-level={level} />
              ))}
              More
            </span>
            <span className="legend-item">
              <i className="failed" /> Failed
            </span>
            <span className="legend-item">
              <i className="pending" /> Pending
            </span>
          </div>

          {selected && <DayDetailPanel day={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </section>
  );
}
