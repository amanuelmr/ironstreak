import { useQuery } from "@tanstack/react-query";

import { ApiError } from "../api/client";
import { getGoal } from "../api/endpoints";
import { qk } from "../api/keys";
import type { Goal } from "../types";

/** `data === null` means no active goal (first run) — not an error. */
export function useGoal() {
  return useQuery<Goal | null>({
    queryKey: qk.goal,
    queryFn: async () => {
      try {
        return await getGoal();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}
