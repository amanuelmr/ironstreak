import type { ActivityDay } from "../types";
import { buildCalendar } from "./calendar";

const WIDTH = 1200;
const HEIGHT = 630;
const HEAT = ["#151a22", "#0e4429", "#006d32", "#26a641", "#39d353"];

export type SnapshotData = {
  currentStreak: number;
  longestStreak: number;
  activity: ActivityDay[];
  todayKey: string;
};

/** Renders a shareable PNG of the iron streak + a mini heatmap. Always dark — a branded
 * card, not a mirror of the viewer's theme. Local-only: caller downloads it, we never send
 * it anywhere. */
export async function renderStreakSnapshot(data: SnapshotData): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not supported in this browser.");

  ctx.fillStyle = "#0b0e14";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#4c8dff";
  ctx.font = "600 22px 'JetBrains Mono', monospace";
  ctx.fillText("IRONSTREAK", 64, 70);

  ctx.fillStyle = "#eef1f6";
  ctx.font = "700 220px 'Space Grotesk', sans-serif";
  ctx.fillText(String(data.currentStreak), 60, 340);
  const numWidth = ctx.measureText(String(data.currentStreak)).width;

  ctx.fillStyle = "#eef1f6";
  ctx.font = "600 32px 'Space Grotesk', sans-serif";
  ctx.fillText(data.currentStreak === 1 ? "day in a row" : "days in a row", 76 + numWidth, 250);

  ctx.fillStyle = "#8994a6";
  ctx.font = "500 26px 'Inter', sans-serif";
  ctx.fillText(`Best streak · ${data.longestStreak}`, 76 + numWidth, 300);

  const model = buildCalendar(data.activity, data.todayKey, 14);
  const cell = 18;
  const gap = 6;
  const gridWidth = model.weeks.length * (cell + gap) - gap;
  const startX = WIDTH - gridWidth - 64;
  const startY = 440;
  model.weeks.forEach((week, w) => {
    week.forEach((day, d) => {
      if (day.kind === "future") return;
      const x = startX + w * (cell + gap);
      const y = startY + d * (cell + gap);
      ctx.fillStyle = HEAT[day.level];
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, 4);
      ctx.fill();
    });
  });

  ctx.fillStyle = "#616c7d";
  ctx.font = "500 20px 'Inter', sans-serif";
  ctx.fillText("Local-first challenge tracker — no account, no cloud.", 64, HEIGHT - 56);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render the snapshot image."))), "image/png");
  });
}
