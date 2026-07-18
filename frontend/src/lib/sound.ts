let context: AudioContext | null = null;

/** Two short sine notes; no audio asset needed. Silently no-ops if blocked. */
export function playReminderChirp(): void {
  try {
    context = context ?? new AudioContext();
    const now = context.currentTime;
    for (const [offset, frequency] of [
      [0, 880],
      [0.18, 1174.66],
    ] as const) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.05, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.15);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.16);
    }
  } catch {
    // AudioContext unavailable or blocked without a user gesture — skip.
  }
}
