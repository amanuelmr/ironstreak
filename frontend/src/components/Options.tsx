import { useQueryClient } from "@tanstack/react-query";
import { Download, Flame, Moon, Sun, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { useTheme } from "../hooks/useTheme";
import { clearAllData, exportData, importData, type Backup } from "../data/repo";

export function Options() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

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
      await importData(backup);
      await queryClient.invalidateQueries();
      setMessage(`Imported ${backup.challenges.length} challenges, ${backup.entries.length} entries.`);
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
          use it to move your data to another browser or device.
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
    </main>
  );
}
