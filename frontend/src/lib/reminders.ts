// Reminder settings live in chrome.storage.local so the service worker can read
// them (localStorage is not available in a worker). All access is guarded so the
// page still renders outside an extension context (e.g. served over http for tests).

const api = typeof chrome !== "undefined" ? chrome : undefined;

export const remindersSupported = Boolean(api?.storage?.local && api?.notifications);

export type ReminderSettings = { enabled: boolean; time: string };

const DEFAULTS: ReminderSettings = { enabled: false, time: "20:00" };
const NOTIF_ID = "ironstreak-streak-reminder";

export async function getReminderSettings(): Promise<ReminderSettings> {
  if (!api?.storage?.local) return DEFAULTS;
  const stored = await api.storage.local.get(["reminderEnabled", "reminderTime"]);
  return {
    enabled: Boolean(stored.reminderEnabled),
    time: typeof stored.reminderTime === "string" ? stored.reminderTime : DEFAULTS.time,
  };
}

export async function setReminderSettings(settings: ReminderSettings): Promise<void> {
  await api?.storage?.local?.set({
    reminderEnabled: settings.enabled,
    reminderTime: settings.time,
  });
}

export function sendTestNotification(): void {
  api?.notifications?.create(NOTIF_ID, {
    type: "basic",
    iconUrl: api.runtime?.getURL("icons/128.png") ?? "icons/128.png",
    title: "Ironstreak reminder",
    message: "Test reminder — real ones nudge you once a day only if you haven't logged.",
    priority: 0,
  });
}
