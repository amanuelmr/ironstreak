import confetti from "canvas-confetti";

const COLORS = ["#4c8dff", "#2ecc8f", "#f5b74e", "#ffffff"];
const MILESTONES = new Set([7, 30, 100]);

export function fireSubmitConfetti(streakAfter: number): void {
  if (MILESTONES.has(streakAfter)) {
    const bursts: Array<{ x: number; delay: number }> = [
      { x: 0.2, delay: 0 },
      { x: 0.8, delay: 250 },
      { x: 0.5, delay: 500 },
    ];
    for (const burst of bursts) {
      window.setTimeout(() => {
        void confetti({
          particleCount: 85,
          spread: 90,
          startVelocity: 45,
          origin: { x: burst.x, y: 0.9 },
          colors: COLORS,
          disableForReducedMotion: true,
        });
      }, burst.delay);
    }
    return;
  }

  void confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 40,
    origin: { x: 0.5, y: 0.9 },
    colors: COLORS,
    disableForReducedMotion: true,
  });
}
