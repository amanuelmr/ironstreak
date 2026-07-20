import { useQuery } from "@tanstack/react-query";

import { getActivity } from "../api/endpoints";
import { qk } from "../api/keys";

export const ACTIVITY_DAYS = 182; // 26 weeks

export function useActivity(days: number = ACTIVITY_DAYS) {
  return useQuery({ queryKey: qk.activity(days), queryFn: () => getActivity(days) });
}
