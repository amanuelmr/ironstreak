# Ironstreak

Ironstreak is a self-accountability web app for one daily commitment that requires at least one hour of work. Every evening it escalates reminders until proof is submitted, and the day is failed if proof is still missing at the deadline. Miss midnight and the streak resets to zero: no rescheduling, no grace period, no mercy.

## Reminder Schedule

All times use the local timezone from `TZ`, defaulting to `Africa/Addis_Ababa`.

| Time | Job |
|---|---|
| 00:01 | Create today's pending streak day |
| 20:00 | Reminder 1 |
| 21:00 | Reminder 2 |
| 21:30 | Reminder 3 |
| 22:00 | Reminder 4 |
| 22:30 | Reminder 5 |
| 23:00 | Reminder 6 |
| 23:30 | Reminder 7 |
| 23:59 | Fail pending day and reset current streak |

## Run Locally

```bash
git clone https://github.com/your-username/ironstreak
cd ironstreak

python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
uvicorn main:app --reload
```

Open `frontend/index.html` directly in a browser, or serve it:

```bash
cd frontend
python3 -m http.server 3000
```

The frontend calls `http://127.0.0.1:8000` by default. To point it elsewhere, run this in the browser console before reloading:

```js
localStorage.setItem("ironstreakApiBase", "http://127.0.0.1:8000");
```

## Project Structure

```text
ironstreak/
├── backend/
│   ├── main.py              FastAPI app entry point and scheduler startup
│   ├── models.py            SQLAlchemy ORM models
│   ├── database.py          SQLite engine, session factory, and Base
│   ├── scheduler.py         APScheduler reminder, reset, and fail jobs
│   ├── routers/
│   │   ├── goal.py          Goal create/get endpoints
│   │   ├── streak.py        Streak stats and history endpoints
│   │   └── checkin.py       Proof submission and reminder status endpoints
│   └── requirements.txt     Python dependencies
├── frontend/
│   ├── index.html           Single page app markup
│   ├── style.css            App styling
│   └── app.js               Frontend state, polling, forms, and heatmap
└── README.md
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+ with FastAPI |
| Database | SQLite with SQLAlchemy ORM |
| Scheduler | APScheduler inside FastAPI |
| Frontend | Vanilla HTML, CSS, and JavaScript |
| Dev Server | Uvicorn |
