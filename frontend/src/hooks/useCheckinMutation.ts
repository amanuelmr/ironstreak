import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import { qk } from "../api/keys";
import { fireSubmitConfetti } from "../lib/confetti";
import type { CheckinPayload, StreakDay } from "../types";

type CheckinResult = StreakDay & {
  current_streak: number;
  longest_streak: number;
};

export function useCheckinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckinPayload) =>
      apiFetch<CheckinResult>("/api/checkin", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (result) => {
      const { current_streak, longest_streak, ...day } = result;
      queryClient.setQueryData<StreakDay>(qk.today, day as StreakDay);
      void queryClient.invalidateQueries({ queryKey: qk.streak });
      void queryClient.invalidateQueries({ queryKey: ["history"] });
      void queryClient.invalidateQueries({ queryKey: qk.reminder });
      void queryClient.invalidateQueries({ queryKey: qk.stats });
      fireSubmitConfetti(current_streak);
    },
  });
}
