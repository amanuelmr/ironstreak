import { useQueryClient } from "@tanstack/react-query";
import { Bell, Download, Flame, Moon, Sparkles, Sun, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "../hooks/useTheme";
import { clearAllData, exportData, importData, type Backup } from "../data/repo";
import {
  getReminderSettings,
  remindersSupported,
  sendTestNotification,
  setReminderSettings,
} from "../lib/reminders";
import {
  DEFAULT_MODEL,
  MODELS,
  getGroqSettings,
  groqSupported,
  hasGroqPermission,
  requestGroqPermission,
  setGroqSettings,
} from "../lib/groq";

export function Options() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");

  useEffect(() => {
    void getReminderSettings().then((s) => {
      setReminderEnabled(s.enabled);
      setReminderTime(s.time);
    });
  }, []);

  function updateReminder(next: { enabled?: boolean; time?: string }) {
    const enabled = next.enabled ?? reminderEnabled;
    const time = next.time ?? reminderTime;
    setReminderEnabled(enabled);
    setReminderTime(time);
    void setReminderSettings({ enabled, time });
  }

  const [groqEnabled, setGroqEnabled] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState("");
  const [groqModel, setGroqModel] = useState(DEFAULT_MODEL);
  const [groqMsg, setGroqMsg] = useState("");

  useEffect(() => {
    void getGroqSettings().then((s) => {
      setGroqEnabled(s.enabled);
      setGroqApiKey(s.apiKey);
      setGroqModel(s.model);
    });
  }, []);

  function persistGroq(next: { enabled?: boolean; apiKey?: string; model?: string }) {
    const settings = {
      enabled: next.enabled ?? groqEnabled,
      apiKey: next.apiKey ?? groqApiKey,
      model: next.model ?? groqModel,
    };
    void setGroqSettings(settings);
  }

  async function handleGroqToggle(checked: boolean) {
    if (checked) {
      const granted = (await hasGroqPermission()) || (await requestGroqPermission());
      if (!granted) {
        setGroqMsg("Permission to reach api.groq.com was declined — AI check stays off.");
        return;
      }
    }
    setGroqMsg("");
    setGroqEnabled(checked);
    persistGroq({ enabled: checked });
  }

  async function handleExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ironstreak-backup-${data.exported_at.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${data.challenges.length} challenges, ${data.entries.length} entries.`);
  }

  async function handleImportFile(file: File) {
    try {
      const backup = JSON.parse(await file.text()) as Backup;
      const result = await importData(backup);
      await queryClient.invalidateQueries();
      const skipped = result.skippedChallenges + result.skippedEntries;
      setMessage(
        `Added ${result.addedChallenges} challenges, ${result.addedEntries} entries.` +
          (skipped ? ` Skipped ${skipped} already in this browser.` : ""),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  async function handleClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await clearAllData();
    await queryClient.invalidateQueries();
    setConfirmClear(false);
    setMessage("All data cleared.");
  }

  return (
    <main className="app-shell options-page">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Flame size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1>Ironstreak</h1>
            <p>Settings</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <section className="tool-panel options-section">
        <h2>Your data</h2>
        <p className="options-note">
          Everything lives in this browser only — nothing is uploaded. Export a backup regularly, and
          use it to move your data to another browser or device. Importing merges into what's already
          here — it never deletes or overwrites existing challenges or entries.
        </p>
        <div className="options-actions">
          <button type="button" className="secondary-button" onClick={() => void handleExport()}>
            <Download size={15} aria-hidden="true" />
            Export backup (JSON)
          </button>
          <button type="button" className="secondary-button" onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden="true" />
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className={`ghost-button danger ${confirmClear ? "confirming" : ""}`}
            onClick={() => void handleClear()}
          >
            <Trash2 size={15} aria-hidden="true" />
            {confirmClear ? "Confirm — erase everything?" : "Clear all data"}
          </button>
        </div>
        {message && <p className="options-message">{message}</p>}
      </section>

      <section className="tool-panel options-section">
        <h2>Reminders</h2>
        {remindersSupported ? (
          <>
            <p className="options-note">
              A gentle once-a-day nudge — it only fires if you have an active challenge and haven't
              logged anything that day, and never opens a tab on its own. Reminders work only while
              your browser is running.
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(event) => updateReminder({ enabled: event.target.checked })}
              />
              <span>
                Daily reminder
                <small>Nudge me if I haven't kept my streak.</small>
              </span>
            </label>
            <label className="field reminder-time">
              <span>Reminder time</span>
              <input
                type="time"
                value={reminderTime}
                disabled={!reminderEnabled}
                onChange={(event) => updateReminder({ time: event.target.value })}
              />
            </label>
            <div className="options-actions">
              <button type="button" className="secondary-button" onClick={sendTestNotification}>
                <Bell size={15} aria-hidden="true" />
                Send test notification
              </button>
            </div>
          </>
        ) : (
          <p className="options-note">
            Reminders are available when Ironstreak runs as an installed extension.
          </p>
        )}
      </section>

      <section className="tool-panel options-section">
        <h2>
          <Sparkles size={16} aria-hidden="true" /> Smart time check (Groq AI)
        </h2>
        {groqSupported ? (
          <>
            <p className="options-note">
              Optional. When you log an entry with a link and minutes, Ironstreak asks Groq for a
              rough opinion on whether the time looks plausible for that content. It's a heuristic,
              not a fact-check, and it never blocks logging.
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={groqEnabled}
                onChange={(event) => void handleGroqToggle(event.target.checked)}
              />
              <span>
                Enable AI time check
                <small>Uses your own Groq API key, stored only in this browser.</small>
              </span>
            </label>
            <label className="field">
              <span>Groq API key</span>
              <input
                type="password"
                value={groqApiKey}
                placeholder="gsk_…"
                autoComplete="off"
                onChange={(event) => {
                  setGroqApiKey(event.target.value);
                  persistGroq({ apiKey: event.target.value });
                }}
              />
            </label>
            <label className="field ai-model">
              <span>Model</span>
              <select
                value={groqModel}
                onChange={(event) => {
                  setGroqModel(event.target.value);
                  persistGroq({ model: event.target.value });
                }}
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <p className="options-note">
              Your key is sent directly from your browser to Groq and never to us — there is no
              server. Get a free key at{" "}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                console.groq.com/keys
              </a>
              .
            </p>
            {groqMsg && <p className="options-message">{groqMsg}</p>}
          </>
        ) : (
          <p className="options-note">
            The AI time check is available when Ironstreak runs as an installed extension.
          </p>
        )}
      </section>
    </main>
  );
}
