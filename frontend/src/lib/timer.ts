// On-device tab-time tracking: opt-in, measures actual focused time on a linked
// resource's tab instead of asking the user (or an AI) to estimate it. All state lives
// in chrome.storage.session inside the service worker — nothing leaves the device.
// Guarded so pages still render outside an extension context.

const api = typeof chrome !== "undefined" ? chrome : undefined;

export const TABS_PERMISSION = "tabs";
export const timerSupported = Boolean(api?.runtime?.sendMessage);

export type TimerSession = {
  tabId: number;
  link: string;
  startedAt: number;
  accumulatedMs: number;
  focusedSince: number | null;
  elapsedMs: number;
};

export type TimeTrackingSettings = { enabled: boolean };
const DEFAULTS: TimeTrackingSettings = { enabled: false };

export async function getTimeTrackingSettings(): Promise<TimeTrackingSettings> {
  if (!api?.storage?.local) return DEFAULTS;
  const s = await api.storage.local.get(["timeTrackingEnabled"]);
  return { enabled: Boolean(s.timeTrackingEnabled) };
}

export async function setTimeTrackingSettings(settings: TimeTrackingSettings): Promise<void> {
  await api?.storage?.local?.set({ timeTrackingEnabled: settings.enabled });
}

export function hasTabsPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!api?.permissions?.contains) return resolve(false);
    api.permissions.contains({ permissions: [TABS_PERMISSION] }, (has) => resolve(Boolean(has)));
  });
}

export function requestTabsPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!api?.permissions?.request) return resolve(false);
    api.permissions.request({ permissions: [TABS_PERMISSION] }, (granted) => resolve(Boolean(granted)));
  });
}

function send<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!api?.runtime?.sendMessage) return reject(new Error("Not running as an extension."));
    api.runtime.sendMessage(message, (response: T) => {
      if (api.runtime.lastError) reject(new Error(api.runtime.lastError.message));
      else resolve(response);
    });
  });
}

export async function startTimer(link: string): Promise<TimerSession> {
  const res = await send<{ ok: boolean; session?: TimerSession; error?: string }>({ type: "timer/start", link });
  if (!res.ok || !res.session) throw new Error(res.error || "Could not start the timer.");
  return res.session;
}

/** Stops the running timer and returns the tracked minutes (rounded). */
export async function stopTimer(): Promise<number> {
  const res = await send<{ ok: boolean; minutes: number }>({ type: "timer/stop" });
  return res.minutes;
}

export async function discardTimer(): Promise<void> {
  await send({ type: "timer/discard" });
}

export async function getTimerStatus(): Promise<TimerSession | null> {
  const res = await send<{ ok: boolean; session: TimerSession | null }>({ type: "timer/status" });
  return res.session;
}
