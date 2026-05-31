const API_BASE = localStorage.getItem("ironstreakApiBase") || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 90_000;

const state = {
  streak: null,
  today: null,
  history: [],
  reminder: null,
  reminderCount: null,
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  currentStreak: document.querySelector("#currentStreak"),
  longestStreak: document.querySelector("#longestStreak"),
  goalTitle: document.querySelector("#goalTitle"),
  todayStatus: document.querySelector("#todayStatus"),
  todayBadge: document.querySelector("#todayBadge"),
  todayCard: document.querySelector("#todayCard"),
  heatmap: document.querySelector("#heatmap"),
  reminderBanner: document.querySelector("#reminderBanner"),
  deadlineText: document.querySelector("#deadlineText"),
  streakDial: document.querySelector("#streakDial"),
  missionDate: document.querySelector("#missionDate"),
  remindersSent: document.querySelector("#remindersSent"),
  reminderSteps: document.querySelectorAll(".reminder-step"),
  goalForm: document.querySelector("#goalForm"),
  goalInput: document.querySelector("#goalInput"),
  goalDescription: document.querySelector("#goalDescription"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  els.goalForm.addEventListener("submit", submitGoal);
  await refreshAll();
  window.setInterval(pollToday, POLL_INTERVAL_MS);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(detailToString(data?.detail) || `Request failed: ${response.status}`);
  }
  return data;
}

function detailToString(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || String(item)).join(" ");
  }
  return String(detail);
}

async function refreshAll() {
  try {
    const [streak, history, today, reminder] = await Promise.all([
      apiFetch("/api/streak"),
      apiFetch("/api/history"),
      apiFetch("/api/checkin/today"),
      apiFetch("/api/reminder/status"),
    ]);

    state.streak = streak;
    state.history = history;
    state.today = today;
    state.reminder = reminder;
    if (state.reminderCount === null) {
      state.reminderCount = today.reminder_count;
    }

    setApiStatus("online");
    renderStreak();
    renderToday();
    renderHeatmap(history);
    syncReminderBanner(today, false);
    renderReminderStatus();
  } catch (error) {
    setApiStatus("offline", error.message);
  }
}

async function pollToday() {
  try {
    const today = await apiFetch("/api/checkin/today");
    const previousCount = state.reminderCount ?? today.reminder_count;
    state.today = today;
    state.reminderCount = today.reminder_count;

    setApiStatus("online");
    renderToday();
    renderReminderStatus();

    if (today.status === "submitted") {
      hideReminderBanner();
      await refreshAll();
      return;
    }

    if (today.status === "pending" && today.reminder_count > previousCount) {
      showReminderBanner();
    }
  } catch (error) {
    setApiStatus("offline", error.message);
  }
}

async function submitGoal(event) {
  event.preventDefault();
  const title = els.goalInput.value.trim();
  const description = els.goalDescription.value.trim();
  const note = ensureGoalNote();

  if (!title) {
    note.textContent = "Activity is required.";
    note.classList.remove("ok");
    return;
  }

  try {
    await apiFetch("/api/goal", {
      method: "POST",
      body: JSON.stringify({ title, description: description || null }),
    });
    els.goalForm.reset();
    note.textContent = "Goal set.";
    note.classList.add("ok");
    await refreshAll();
  } catch (error) {
    note.textContent = error.message;
    note.classList.remove("ok");
  }
}

async function submitProof(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const proofLink = form.proof_link.value.trim();
  const proofNote = form.proof_note.value.trim();
  const durationMinutes = Number(form.duration_minutes.value);
  const errorEl = form.querySelector(".field-error");
  const submitButton = form.querySelector("button[type='submit']");

  if (!proofLink) {
    errorEl.textContent = "Proof link is required.";
    return;
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes < 60) {
    errorEl.textContent = "Duration must be at least 60 minutes.";
    return;
  }

  submitButton.disabled = true;
  errorEl.textContent = "";

  try {
    await apiFetch("/api/checkin", {
      method: "POST",
      body: JSON.stringify({
        proof_link: proofLink,
        proof_note: proofNote || null,
        duration_minutes: durationMinutes,
      }),
    });
    hideReminderBanner();
    await refreshAll();
  } catch (error) {
    errorEl.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
}

function renderStreak() {
  const streak = state.streak || {};
  const current = streak.current_streak ?? 0;
  els.currentStreak.textContent = current;
  els.longestStreak.textContent = streak.longest_streak ?? 0;
  els.goalTitle.textContent = streak.goal_title || "No active goal";
  els.todayStatus.textContent = normalizeStatus(streak.today_status || "pending");

  const dialDegrees = Math.min(360, current * 18);
  els.streakDial.style.setProperty("--dial-progress", `${dialDegrees}deg`);
}

function renderToday() {
  const today = state.today;
  if (!today) return;

  const status = today.status || "pending";
  const statusLabel = normalizeStatus(status);
  els.missionDate.textContent = `${formatLongDate(today.date)} · deadline at midnight`;
  els.todayBadge.textContent = statusLabel;
  els.todayBadge.className = `badge ${status}`;

  if (state.streak) {
    els.todayStatus.textContent = statusLabel;
  }

  if (status === "submitted") {
    els.todayCard.innerHTML = submittedMarkup(today);
    return;
  }

  if (status === "failed") {
    els.todayCard.innerHTML = failedMarkup(today);
    return;
  }

  els.todayCard.innerHTML = pendingMarkup(today);
  const proofForm = els.todayCard.querySelector("#proofForm");
  proofForm.addEventListener("submit", submitProof);
}

function pendingMarkup(today) {
  const hasGoal = Boolean(state.streak?.goal_title);
  return `
    <div class="today-date">Today · ${escapeHtml(formatDate(today.date))}</div>
    <form id="proofForm" class="proof-form">
      <div class="proof-grid">
        <label>
          <span>Proof link</span>
          <input name="proof_link" type="url" inputmode="url" autocomplete="url" required>
        </label>
        <label>
          <span>Note</span>
          <textarea name="proof_note" rows="5"></textarea>
        </label>
        <div class="duration-row">
          <label>
            <span>Duration</span>
            <input name="duration_minutes" type="number" min="60" step="1" value="60" required>
          </label>
          <small>min >= 60</small>
        </div>
      </div>
      <div class="field-error">${hasGoal ? "" : "Set an active goal before submitting proof."}</div>
      <button type="submit" class="primary-action" ${hasGoal ? "" : "disabled"}>
        <span aria-hidden="true">✓</span>
        Submit Proof
      </button>
    </form>
  `;
}

function submittedMarkup(today) {
  return `
    <div class="state-block">
      <div class="today-date">Today · ${escapeHtml(formatDate(today.date))}</div>
      <strong>Proof locked in.</strong>
      <p><a href="${escapeAttribute(today.proof_link)}" target="_blank" rel="noreferrer">${escapeHtml(today.proof_link)}</a></p>
      <div class="receipt-grid">
        <div>
          <span>Status</span>
          <strong>Submitted</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>${escapeHtml(String(today.duration_minutes || 0))} min</strong>
        </div>
        <div>
          <span>Logged</span>
          <strong>${escapeHtml(formatTime(today.submitted_at))}</strong>
        </div>
      </div>
    </div>
  `;
}

function failedMarkup(today) {
  return `
    <div class="state-block">
      <div class="today-date">Today · ${escapeHtml(formatDate(today.date))}</div>
      <strong>Streak reset.</strong>
      <p>Streak reset to 0.</p>
      <p>Come back tomorrow.</p>
    </div>
  `;
}

function renderHeatmap(history) {
  const byDate = new Map(history.map((day) => [day.date, day]));
  const cells = [];
  const today = startOfLocalDay(new Date());

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    const entry = byDate.get(key);
    const status = entry?.status || "empty";
    const label = `${formatDate(key)} · ${normalizeStatus(status)}`;
    cells.push(`<div class="heat-cell ${status}" title="${escapeAttribute(label)}" aria-label="${escapeAttribute(label)}">${date.getDate()}</div>`);
  }

  els.heatmap.innerHTML = cells.join("");
}

function renderReminderStatus() {
  const reminder = state.reminder;
  if (!reminder) return;

  const sent = state.today?.reminder_count ?? reminder.reminders_sent_today ?? 0;
  els.remindersSent.textContent = `${sent} sent`;
  els.reminderSteps.forEach((step) => {
    const index = Number(step.dataset.reminderIndex);
    step.classList.toggle("sent", index <= sent);
    step.classList.toggle("next", index === sent + 1 && state.today?.status === "pending");
  });

  if (reminder.next_reminder_at) {
    els.deadlineText.textContent = `Next reminder: ${formatTime(reminder.next_reminder_at)} · Deadline: midnight`;
    return;
  }

  els.deadlineText.textContent = "Deadline: midnight";
}

function syncReminderBanner(today, allowCurrentCountAlert) {
  if (today.status === "submitted") {
    hideReminderBanner();
    return;
  }

  if (today.status === "pending" && today.reminder_count > 0 && allowCurrentCountAlert) {
    showReminderBanner();
  }
}

function showReminderBanner() {
  els.reminderBanner.hidden = false;
}

function hideReminderBanner() {
  els.reminderBanner.hidden = true;
}

function setApiStatus(status, message = "") {
  els.apiStatus.className = `status-pill ${status}`;
  els.apiStatus.textContent = status === "online" ? "Online" : "Offline";
  if (message) {
    els.apiStatus.title = message;
  } else {
    els.apiStatus.removeAttribute("title");
  }
}

function ensureGoalNote() {
  let note = els.goalForm.querySelector(".form-note");
  if (!note) {
    note = document.createElement("div");
    note.className = "form-note";
    els.goalForm.append(note);
  }
  return note;
}

function normalizeStatus(status) {
  return String(status || "pending").toUpperCase();
}

function formatDate(value) {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatLongDate(value) {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function parseDateOnly(value) {
  if (value instanceof Date) return value;
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
