import { useEffect, useMemo, useRef } from "react";

import { useActivity } from "../hooks/useActivity";
import { useOverview } from "../hooks/useOverview";
import { buildCalendar } from "../lib/calendar";
import { ErrorState } from "./ErrorState";
import { PanelHeading } from "./PanelHeading";
import { Skeleton } from "./Skeleton";

const WEEKS = 26;

export function ContributionCalendar() {
  const overviewQuery = useOverview();
  const activityQuery = useActivity();
  const scrollRef = useRef<HTMLDivElement>(null);

  const todayKey = overviewQuery.data?.server_today;
  const model = useMemo(
    () => (todayKey ? buildCalendar(activityQuery.data ?? [], todayKey, WEEKS) : null),
    [activityQuery.data, todayKey],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node && model) node.scrollLeft = node.scrollWidth;
  }, [model]);

  return (
    <section className="tool-panel history-panel">
      <PanelHeading eyebrow="Record" title="Activity · last 26 weeks" />

      {activityQuery.isError ? (
        <ErrorState message="Could not load activity." onRetry={() => void activityQuery.refetch()} />
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
                <div className="cal-grid" role="img" aria-label="Daily activity, last 26 weeks">
                  {model.weeks.flat().map((cell) =>
                    cell.kind === "future" ? (
                      <span className="cal-cell future" key={cell.key} aria-hidden="true" />
                    ) : (
                      <span
                        key={cell.key}
                        className={`cal-cell${cell.isToday ? " today" : ""}`}
                        data-level={cell.level}
                        title={cell.label}
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
              {[0, 1, 2, 3, 4].map((level) => (
                <i key={level} data-level={level} />
              ))}
              More
            </span>
          </div>
        </>
      )}
    </section>
  );
}
