import { CheckCircle2, Clock3, HelpCircle, Link as LinkIcon, ShieldAlert, X } from "lucide-react";

import { formatLongDate, formatTime } from "../lib/dates";
import type { StreakDay } from "../types";

export function DayDetailPanel({ day, onClose }: { day: StreakDay; onClose: () => void }) {
  return (
    <div className="day-detail">
      <div className="day-detail-head">
        <span className={`day-detail-status ${day.status}`}>
          {day.status === "submitted" ? (
            <CheckCircle2 size={15} aria-hidden="true" />
          ) : day.status === "failed" ? (
            <ShieldAlert size={15} aria-hidden="true" />
          ) : (
            <HelpCircle size={15} aria-hidden="true" />
          )}
          {day.status}
        </span>
        <strong>{formatLongDate(day.date)}</strong>
        <button type="button" className="dismiss-button" aria-label="Close day details" onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      {day.status === "submitted" ? (
        <div className="day-detail-body">
          {day.proof_link && (
            <a href={day.proof_link} target="_blank" rel="noreferrer">
              <LinkIcon size={13} aria-hidden="true" />
              {day.proof_link}
            </a>
          )}
          {day.proof_note && <p className="proof-note">{day.proof_note}</p>}
          <div className="receipt-row">
            {day.duration_minutes != null && (
              <span>
                <Clock3 size={13} aria-hidden="true" />
                {day.duration_minutes} min
              </span>
            )}
            {day.submitted_at && <span>submitted {formatTime(day.submitted_at)}</span>}
          </div>
        </div>
      ) : (
        <div className="day-detail-body">
          <p className="proof-note">
            {day.status === "failed" ? "No proof was submitted before midnight." : "Still pending."}
          </p>
        </div>
      )}
    </div>
  );
}
