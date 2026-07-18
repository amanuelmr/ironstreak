# Ironstreak

Ironstreak is a self-accountability web app for one daily commitment that requires at least one hour of work. Every evening it escalates reminders until proof is submitted, and the day is failed if proof is still missing at the deadline. Miss midnight and the streak resets to zero: no rescheduling, no grace period, no mercy.

## Reminder Schedule

All times use the local timezone from `TZ`, defaulting to `Africa/Addis_Ababa`.

| Time | Job |
|---|---|
| 00:01 | Roll over to the new day (fallback creation of the pending streak day) |
| 20:00 | Reminder 1 |
| 21:00 | Reminder 2 |
| 21:30 | Reminder 3 |
| 22:00 | Reminder 4 |
| 22:30 | Reminder 5 |
| 23:00 | Reminder 6 |
| 23:30 | Reminder 7 |
| 23:59 | Fail pending day and reset current streak |

You don't create the streak day yourself, and it isn't only created at 00:01. Today's pending streak day is created automatically the first time the app or API is touched that day (app startup and every read endpoint call `get_or_create_today`). The 00:01 job is just a fallback that guarantees the record exists even if you never open the app.

With browser notifications enabled in the app header, each reminder fires a desktop notification while the tab is open.

## Run Locally

The backend needs a Postgres database (a free [Neon](https://neon.tech) instance works well).

```bash
git clone https://github.com/amanuelmr/ironstreak
cd ironstreak

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
# edit backend/.env and set DATABASE_URL to your Postgres connection string

cd backend
uvicorn main:app --reload
```

Environment variables (see `backend/.env.example`):

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | required |
| `TZ` | IANA timezone for the daily boundary and reminders | `Africa/Addis_Ababa` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://127.0.0.1:5173` |

In another terminal, start the frontend. This project uses [pnpm](https://pnpm.io):

```bash
cd frontend
pnpm install
pnpm dev
```

To build for production, run `pnpm build`.

Open the Vite URL printed in the terminal, usually `http://127.0.0.1:5173`.

The frontend calls `http://127.0.0.1:8000` by default. To point it elsewhere, set `VITE_API_BASE` in a Vite env file or run this in the browser console before reloading:

```js
localStorage.setItem("ironstreakApiBase", "http://127.0.0.1:8000");
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/goal` | Set a new active goal (deactivates the previous one) |
| GET | `/api/goal` | Get the active goal (404 if none) |
| GET | `/api/streak` | Streak counters, today's status, active goal title/description, server timezone, and `server_today` |
| GET | `/api/history?days=N` | Streak days in the last N calendar days (1–365, default 30), newest first |
| GET | `/api/stats` | Totals: submitted/failed days, completion rate, minutes/hours logged, streaks |
| POST | `/api/checkin` | Submit today's proof (link, note, duration ≥ 60 min) |
| GET | `/api/checkin/today` | Today's streak day |
| GET | `/api/reminder/status` | Next reminder time and reminders sent today |
| GET | `/api/health` | Liveness probe |

## Tests

```bash
cd backend
python -m pytest
```

Tests run against an in-memory SQLite database via a dependency override — they never touch the Postgres configured in `.env`, and the scheduler is never started.

## Project Structure

```text
ironstreak/
├── backend/
│   ├── main.py              FastAPI app entry point, CORS, and scheduler startup
│   ├── models.py            SQLAlchemy ORM models
│   ├── schemas.py           Pydantic response models
│   ├── database.py          Postgres engine, session factory, and Base
│   ├── scheduler.py         APScheduler reminder, reset, and fail jobs
│   ├── routers/
│   │   ├── goal.py          Goal create/get endpoints
│   │   ├── streak.py        Streak, history, and stats endpoints
│   │   └── checkin.py       Proof submission and reminder status endpoints
│   ├── tests/               Pytest suite (in-memory SQLite)
│   ├── .env.example         Environment variable template
│   └── requirements.txt     Pinned Python dependencies
├── frontend/
│   ├── index.html           Vite HTML entry point, fonts, theme bootstrap
│   ├── package.json         React/Vite scripts and dependencies
│   └── src/
│       ├── App.tsx          Layout shell
│       ├── api/             Typed fetch client and endpoint functions
│       ├── hooks/           TanStack Query hooks, theme, notifications
│       ├── components/      Panels, calendar, forms, skeletons
│       ├── lib/             Date/calendar math, confetti, sound
│       └── styles/          Design tokens and stylesheets
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+ with FastAPI |
| Database | PostgreSQL (Neon) with SQLAlchemy ORM |
| Scheduler | APScheduler inside FastAPI |
| Frontend | React, TypeScript, TanStack Query, and CSS with Vite |
| Package Manager | pnpm (frontend) |
| Dev Server | Uvicorn |
