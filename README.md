# Ironstreak

Ironstreak is a **local-first browser extension** for personal accountability. Run **challenges** — time-boxed commitments you log progress against and finish when you decide — and keep your **iron streak**: every day you make progress on any challenge counts. Click the toolbar icon to open your dashboard — streak, activity heatmap, and challenges — in a tab. It stays out of your way until you open it (your normal new-tab page is untouched).

**All data stays in your browser** (IndexedDB). There's no server, no account, and nothing is ever uploaded. Back it up or move it to another device with one-click JSON export/import.

## Install / Share

Ironstreak is shared as a zip you load directly into your browser — no store needed. Works in **Chrome** and **Edge**.

1. Get `ironstreak-extension.zip` and unzip it to a folder you'll keep (deleting the folder removes the extension, not your data).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and select the unzipped folder.
5. Click the Ironstreak toolbar icon (pin it from the puzzle-piece menu) — the dashboard opens in a tab. Your new-tab page is left as it was.

It stays installed across restarts. To update, unzip a newer build over the folder and click the refresh icon on the extension card.

> Why a zip and not a `.crx`? Modern Chrome refuses to install `.crx` files that don't come from the Web Store, so **Load unpacked** is the reliable way to share privately.

## Build from source

Requires Node + [pnpm](https://pnpm.io).

```bash
cd frontend
pnpm install
pnpm bundle     # builds and writes frontend/ironstreak-extension.zip
```

For development, `pnpm build` writes the unpacked extension to `frontend/dist/` — Load unpacked that folder directly.

## Data & privacy

- Stored locally in your browser via **IndexedDB**. The extension makes no network calls by default (fonts load from Google Fonts, with a system-font fallback). The only outbound data call is optional: if you turn on the **Smart time check** below, the entry's link/note/minutes go directly from your browser to Groq using your own API key.
- **Options page** (right-click the icon → Options, or the extensions page → Details → Extension options): toggle theme, set a daily reminder (below), **Export backup (JSON)**, **Import backup**, and **Clear all data**.
- Data is per-browser/per-device. Export + import is how you move it or keep a backup — do it regularly, since uninstalling clears local storage.

## Reminders

Optional and **off by default**. In Options, enable **Daily reminder** and pick a time (default 8:00 PM). Once a day at that time, Ironstreak sends a single gentle notification — but only if you have an active challenge and haven't logged anything yet that day (if your streak is already safe, it stays silent). Clicking the notification opens the dashboard; it never opens a tab on its own. Use **Send test notification** to confirm it works. Reminders only fire while your browser is running (a missed one shows shortly after you next open the browser).

## Smart time check (Groq AI)

Optional and **off by default**, **bring-your-own-key**. In Options, enable it and paste a free [Groq](https://console.groq.com/keys) API key. When you log an entry that has a link and minutes, Ironstreak asks Groq (`openai/gpt-oss-20b` by default) for a rough opinion on whether the claimed time is plausible for that content, and shows a small badge on the entry — **on track**, **seems short**, or **seems long** — with its reasoning and an estimated range on hover.

- It's a **heuristic, not a fact-check**: the model can't open the link, so it judges from the URL/domain, your note, and general knowledge.
- It **never blocks logging** — the entry always saves; the verdict is best-effort and appears (or doesn't) after.
- Your key is stored only in this browser (`chrome.storage.local`) and sent **directly from your device to Groq** — there's no server, and it's never committed to the repo or shared with the developer. Enabling it requests a one-time permission to reach `api.groq.com`. Treat the key as yours; rotate it if it ever leaks.

## Surfaces

- **Dashboard** — opens in a tab when you click the toolbar icon (clicking again re-focuses the same tab): iron streak, activity heatmap, and your challenges. Log progress on each challenge here.
- **Options** — theme, daily reminder, smart time check (Groq), backup/restore.

## Project Structure

```text
ironstreak/
├── frontend/                The extension (React + Vite, built with @crxjs/vite-plugin)
│   ├── manifest.json        MV3 manifest (toolbar action + background worker + options)
│   ├── dashboard.html · options.html
│   ├── public/icons/        16 / 48 / 128 px icons
│   └── src/
│       ├── sw.ts            Service worker — opens the dashboard tab on icon click
│       ├── entries/         dashboard / options React roots
│       ├── data/            db.ts (Dexie/IndexedDB) + repo.ts (all data ops)
│       ├── components/      StreakHeader, ContributionCalendar, Challenge*, Options
│       ├── hooks/           TanStack Query hooks + theme
│       ├── lib/             dates, streaks, calendar
│       ├── styles/          Deep Ocean design tokens + stylesheets
│       └── types.ts
├── backend/                 Retired — the old FastAPI/Neon server (kept for history; unused)
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome/Edge Manifest V3 (local-first, no backend) |
| UI | React 19, TypeScript, TanStack Query, hand-rolled CSS design tokens |
| Storage | IndexedDB via Dexie (`unlimitedStorage` + `storage`) |
| Build | Vite 7 + `@crxjs/vite-plugin`, pnpm |

## Follow-ups (not in this build)

- **Firefox** support (`webextension-polyfill`, `browser_specific_settings`, AMO listing).
- **Chrome Web Store** publish for public discoverability.
- **Cross-device sync** beyond manual export/import.
