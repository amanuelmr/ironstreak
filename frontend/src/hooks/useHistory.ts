import { useQuery } from "@tanstack/react-query";

import { getHistory } from "../api/endpoints";
import { qk } from "../api/keys";

export const HISTORY_DAYS = 182; // 26 weeks

export function useHistory(days: number = HISTORY_DAYS) {
  return useQuery({ queryKey: qk.history(days), queryFn: () => getHistory(days) });
}
