import { useCallback, useEffect, useRef, useState } from "react";

import { playReminderChirp } from "../lib/sound";
import type { StreakDay } from "../types";

export type NotifState = "unsupported" | "default" | "granted" | "denied";

export const SOUND_STORAGE_KEY = "ironstreakSound";

const FLASH_TITLE = "(!) Submit proof — Ironstreak";

function supported(): boolean {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

export function useNotifications(today: StreakDay | undefined): {
  state: NotifState;
  request: () => Promise<void>;
} {
  const [state, setState] = useState<NotifState>(() =>
    supported() ? Notification.permission : "unsupported",
  );

  const prevCountRef = useRef<number | null>(null);
  const prevDateRef = useRef<string | null>(null);
  const flashIntervalRef = useRef<number | null>(null);
  const originalTitleRef = useRef(typeof document !== "undefined" ? document.title : "Ironstreak");

  const stopTitleFlash = useCallback(() => {
    if (flashIntervalRef.current !== null) {
      window.clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
      document.title = originalTitleRef.current;
    }
  }, []);

  const startTitleFlash = useCallback(() => {
    if (flashIntervalRef.current !== null) return; // already flashing
    flashIntervalRef.current = window.setInterval(() => {
      document.title = document.title === FLASH_TITLE ? originalTitleRef.current : FLASH_TITLE;
    }, 1500);
  }, []);

  // Must be called from a user gesture (Safari requirement).
  const request = useCallback(async () => {
    if (!supported()) return;
    const permission = await Notification.requestPermission();
    setState(permission);
    if (permission === "granted") {
      try {
        const confirmation = new Notification("Ironstreak", { body: "Reminder alerts enabled." });
        window.setTimeout(() => confirmation.close(), 4000);
      } catch {
        // Some platforms throw on page-context notifications — permission state is what matters.
      }
    }
  }, []);

  useEffect(() => {
    const stopWhenSeen = () => {
      if (document.visibilityState === "visible") stopTitleFlash();
    };
    window.addEventListener("focus", stopWhenSeen);
    document.addEventListener("visibilitychange", stopWhenSeen);
    return () => {
      window.removeEventListener("focus", stopWhenSeen);
      document.removeEventListener("visibilitychange", stopWhenSeen);
      stopTitleFlash();
    };
  }, [stopTitleFlash]);

  useEffect(() => {
    if (!today) return;

    if (today.status !== "pending") {
      stopTitleFlash();
    }

    // First data for this date: seed the counter without notifying
    // (also makes StrictMode double-invocation harmless).
    if (prevDateRef.current !== today.date) {
      prevDateRef.current = today.date;
      prevCountRef.current = today.reminder_count;
      return;
    }

    const previous = prevCountRef.current ?? today.reminder_count;
    prevCountRef.current = today.reminder_count;

    if (today.status !== "pending" || today.reminder_count <= previous) return;

    if (supported() && Notification.permission === "granted") {
      try {
        const notification = new Notification("Ironstreak — submit proof", {
          body: `Reminder ${today.reminder_count}/7 · deadline 23:59`,
          tag: "ironstreak-reminder",
        });
        notification.onclick = () => window.focus();
      } catch {
        // Notification construction can fail on some platforms — banner still shows.
      }
    }

    if (document.visibilityState !== "visible") {
      startTitleFlash();
    }

    if (localStorage.getItem(SOUND_STORAGE_KEY) === "1") {
      playReminderChirp();
    }
  }, [today, startTitleFlash, stopTitleFlash]);

  return { state, request };
}
