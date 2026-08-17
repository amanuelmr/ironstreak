import { Loader2, Share2 } from "lucide-react";
import { useState } from "react";

import { useActivity } from "../hooks/useActivity";
import { useOverview } from "../hooks/useOverview";
import { renderStreakSnapshot } from "../lib/snapshot";

const SNAPSHOT_DAYS = 98; // 14 weeks, matches the snapshot's mini heatmap

export function ShareSnapshotButton() {
  const overview = useOverview();
  const activity = useActivity(SNAPSHOT_DAYS);
  const [pending, setPending] = useState(false);

  async function handleShare() {
    if (!overview.data) return;
    setPending(true);
    try {
      const blob = await renderStreakSnapshot({
        currentStreak: overview.data.current_streak,
        longestStreak: overview.data.longest_streak,
        activity: activity.data ?? [],
        todayKey: overview.data.server_today,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ironstreak-streak-${overview.data.server_today}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="icon-button share-snapshot-button"
      aria-label="Save a shareable streak image"
      title="Save a shareable streak image"
      disabled={pending || !overview.data}
      onClick={() => void handleShare()}
    >
      {pending ? <Loader2 size={15} className="spinner" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
    </button>
  );
}
