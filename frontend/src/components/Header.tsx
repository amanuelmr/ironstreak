import { Flame, Moon, Sun } from "lucide-react";

import type { Theme } from "../types";

export type ApiState = "connecting" | "online" | "offline";

export function Header({
  apiState,
  theme,
  onToggleTheme,
}: {
  apiState: ApiState;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <Flame size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1>Ironstreak</h1>
          <p>Run your challenges. Finish what you start.</p>
        </div>
      </div>

      <div className="topbar-meta">
        <span className={`api-pill ${apiState}`} aria-live="polite">
          {apiState}
        </span>
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
