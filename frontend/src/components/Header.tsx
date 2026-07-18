import { Bell, BellOff, BellRing, Clock3, Flame, Moon, Sun } from "lucide-react";

import type { NotifState } from "../hooks/useNotifications";
import type { Theme } from "../types";

export type ApiState = "connecting" | "online" | "offline";

export function Header({
  apiState,
  deadlineCopy,
  theme,
  onToggleTheme,
  notifState,
  onEnableNotifications,
}: {
  apiState: ApiState;
  deadlineCopy: string;
  theme: Theme;
  onToggleTheme: () => void;
  notifState: NotifState;
  onEnableNotifications: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Flame size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1>Ironstreak</h1>
          <p>One hour, one proof, every day.</p>
        </div>
      </div>

      <div className="topbar-meta">
        <span className="soft-pill">
          <Clock3 size={14} aria-hidden="true" />
          {deadlineCopy}
        </span>
        <span className={`api-pill ${apiState}`} aria-live="polite">
          {apiState}
        </span>
        {notifState !== "unsupported" && (
          <button
            type="button"
            className={`icon-button notif-button ${notifState}`}
            onClick={onEnableNotifications}
            disabled={notifState === "denied"}
            aria-label={
              notifState === "granted"
                ? "Reminder alerts enabled"
                : notifState === "denied"
                  ? "Notifications blocked in browser settings"
                  : "Enable reminder alerts"
            }
            title={
              notifState === "granted"
                ? "Alerts enabled"
                : notifState === "denied"
                  ? "Blocked — allow notifications in browser settings"
                  : "Enable alerts"
            }
          >
            {notifState === "granted" ? (
              <BellRing size={15} />
            ) : notifState === "denied" ? (
              <BellOff size={15} />
            ) : (
              <Bell size={15} />
            )}
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
