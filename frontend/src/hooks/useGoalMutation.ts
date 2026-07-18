import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createGoal } from "../api/endpoints";
import { qk } from "../api/keys";
import type { Goal } from "../types";

export function useGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGoal,
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal | null>(qk.goal, goal);
      void queryClient.invalidateQueries({ queryKey: qk.streak });
    },
  });
}
