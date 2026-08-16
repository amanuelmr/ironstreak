import { useQuery } from "@tanstack/react-query";

import { getStreakBreak } from "../api/endpoints";
import { qk } from "../api/keys";

export function useStreakBreak() {
  return useQuery({ queryKey: qk.streakBreak, queryFn: getStreakBreak });
}
