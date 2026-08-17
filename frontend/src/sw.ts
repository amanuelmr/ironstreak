// Background service worker.
// - Opens the dashboard in a tab when the toolbar icon is clicked (no popup),
//   reusing an existing dashboard tab.
// - Fires an opt-in, once-a-day "keep your streak" notification via chrome.alarms,
//   only when there's an active challenge and nothing has been logged yet today.
// Never opens a tab on its own — only in response to an explicit user click.
//
// MV3 rule: register every listener at top level, synchronously; do async work
// inside the listener so the returned promise keeps the worker alive.

import { db } from "./data/db";
import { toDateKey } from "./lib/dates";
import { computeStreak } from "./lib/streaks";

const DASHBOARD_URL = chrome.runtime.getURL("dashboard.html");
const ALARM_NAME = "ironstreak-daily-reminder";
const NOTIF_ID = "ironstreak-streak-reminder";
const DEFAULT_TIME = "20:00";

// --- dashboard tab (single instance) ---

async function openOrFocusDashboard(): Promise<void> {
  const { dashboardTabId } = await chrome.storage.session.get("dashboardTabId");
  if (typeof dashboardTabId === "number") {
    try {
      const tab = await chrome.tabs.get(dashboardTabId);
      if (tab.id != null) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
        return;
      }
    } catch {
      // tab was closed — fall through
    }
  }
  const tab = await chrome.tabs.create({ url: DASHBOARD_URL });
  await chrome.storage.session.set({ dashboardTabId: tab.id });
}

chrome.action.onClicked.addListener(() => {
  void openOrFocusDashboard();
});

// --- reminder scheduling ---

function nextOccurrence(hour: number, minute: number): number {
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

async function scheduleReminder(time: string): Promise<void> {
  const [hour, minute] = time.split(":").map(Number);
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, {
    when: nextOccurrence(hour, minute),
    periodInMinutes: 24 * 60,
  });
}

async function syncSchedule(): Promise<void> {
  const { reminderEnabled, reminderTime } = await chrome.storage.local.get([
    "reminderEnabled",
    "reminderTime",
  ]);
  if (reminderEnabled) {
    await scheduleReminder(typeof reminderTime === "string" ? reminderTime : DEFAULT_TIME);
  } else {
    await chrome.alarms.clear(ALARM_NAME);
  }
}

async function reassertAlarm(): Promise<void> {
  const { reminderEnabled } = await chrome.storage.local.get("reminderEnabled");
  if (!reminderEnabled) return;
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) await syncSchedule();
}

// --- the nudge ---

async function showReminder(streak: number): Promise<void> {
  await chrome.notifications.create(NOTIF_ID, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icons/128.png"),
    title: "Keep your iron streak alive",
    message:
      streak > 0
        ? `You haven't logged today. Log one entry to keep your ${streak}-day streak.`
        : "Log one entry today to start your iron streak.",
    priority: 0,
    buttons: [{ title: "Log now" }],
  });
}

async function handleReminderTick(): Promise<void> {
  const { reminderEnabled } = await chrome.storage.local.get("reminderEnabled");
  if (!reminderEnabled) return;

  const activeCount = await db.challenges.where("status").equals("active").count();
  if (activeCount === 0) return;

  const today = toDateKey(new Date());
  const loggedToday = await db.entries.where("local_date").equals(today).count();
  if (loggedToday > 0) return; // streak already safe today — stay silent

  const entries = await db.entries.toArray();
  const [current] = computeStreak(new Set(entries.map((e) => e.local_date)), today);
  await showReminder(current);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void handleReminderTick();
});

chrome.notifications.onClicked.addListener((id) => {
  if (id !== NOTIF_ID) return;
  void chrome.notifications.clear(id);
  void openOrFocusDashboard();
});

chrome.notifications.onButtonClicked.addListener((id) => {
  if (id !== NOTIF_ID) return;
  void chrome.notifications.clear(id);
  void openOrFocusDashboard();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if ("reminderEnabled" in changes || "reminderTime" in changes) {
    void syncSchedule();
  }
});

chrome.runtime.onStartup.addListener(() => {
  void reassertAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
  void reassertAlarm();
});

// --- on-device time tracking (opt-in) ---
// Measures actual focused time on a linked resource's tab instead of asking the user
// (or an AI) to estimate it. All state lives in chrome.storage.session — nothing leaves
// the device, and nothing is tracked unless the user explicitly starts a timer for a
// specific link. Tracking follows the TAB, not the exact URL: if the tracked tab
// navigates elsewhere, time keeps accumulating — simpler and more robust to redirects
// than trying to detect "did they leave the resource."

const TIMER_KEY = "timerSession";

type TimerSession = {
  tabId: number;
  link: string;
  startedAt: number;
  accumulatedMs: number;
  focusedSince: number | null; // null while paused (tab/window not focused)
};

async function getTimerSession(): Promise<TimerSession | null> {
  const stored = await chrome.storage.session.get(TIMER_KEY);
  return (stored[TIMER_KEY] as TimerSession | undefined) ?? null;
}

async function setTimerSession(session: TimerSession | null): Promise<void> {
  if (session) await chrome.storage.session.set({ [TIMER_KEY]: session });
  else await chrome.storage.session.remove(TIMER_KEY);
}

function elapsedMs(session: TimerSession): number {
  return session.accumulatedMs + (session.focusedSince !== null ? Date.now() - session.focusedSince : 0);
}

function withElapsed(session: TimerSession) {
  return { ...session, elapsedMs: elapsedMs(session) };
}

function pause(session: TimerSession): TimerSession {
  if (session.focusedSince === null) return session;
  return { ...session, accumulatedMs: session.accumulatedMs + (Date.now() - session.focusedSince), focusedSince: null };
}

function resume(session: TimerSession): TimerSession {
  if (session.focusedSince !== null) return session;
  return { ...session, focusedSince: Date.now() };
}

async function startTimer(link: string): Promise<TimerSession> {
  const existing = await getTimerSession();
  if (existing) throw new Error("A timer is already running for another entry.");
  const tab = await chrome.tabs.create({ url: link, active: true });
  if (tab.id == null) throw new Error("Could not open the link in a new tab.");
  const session: TimerSession = { tabId: tab.id, link, startedAt: Date.now(), accumulatedMs: 0, focusedSince: Date.now() };
  await setTimerSession(session);
  return session;
}

async function stopTimer(): Promise<number> {
  const session = await getTimerSession();
  if (!session) return 0;
  const minutes = Math.round(elapsedMs(session) / 60_000);
  await setTimerSession(null);
  return minutes;
}

async function discardTimer(): Promise<void> {
  await setTimerSession(null);
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  void (async () => {
    const session = await getTimerSession();
    if (!session) return;
    await setTimerSession(activeInfo.tabId === session.tabId ? resume(session) : pause(session));
  })();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  void (async () => {
    const session = await getTimerSession();
    if (!session) return;
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await setTimerSession(pause(session));
      return;
    }
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, windowId });
      await setTimerSession(activeTab?.id === session.tabId ? resume(session) : pause(session));
    } catch {
      // window gone or query failed — leave session as-is
    }
  })();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const session = await getTimerSession();
    if (!session || session.tabId !== tabId) return;
    // Freeze rather than discard: the dashboard can still stop & fill with what was tracked.
    await setTimerSession(pause(session));
  })();
});

type TimerMessage =
  | { type: "timer/start"; link: string }
  | { type: "timer/stop" }
  | { type: "timer/discard" }
  | { type: "timer/status" };

chrome.runtime.onMessage.addListener((message: TimerMessage, _sender, sendResponse) => {
  if (!message || typeof message !== "object" || !("type" in message)) return undefined;

  if (message.type === "timer/start") {
    startTimer(message.link)
      .then((session) => sendResponse({ ok: true, session: withElapsed(session) }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Could not start the timer." }));
    return true;
  }
  if (message.type === "timer/stop") {
    stopTimer().then((minutes) => sendResponse({ ok: true, minutes }));
    return true;
  }
  if (message.type === "timer/discard") {
    discardTimer().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.type === "timer/status") {
    getTimerSession().then((session) => sendResponse({ ok: true, session: session ? withElapsed(session) : null }));
    return true;
  }
  return undefined;
});
