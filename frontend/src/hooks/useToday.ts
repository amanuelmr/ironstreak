import { useQuery } from "@tanstack/react-query";

import { getToday } from "../api/endpoints";
import { qk } from "../api/keys";

export function useToday() {
  return useQuery({
    queryKey: qk.today,
    queryFn: getToday,
    refetchInterval: 60_000,
    // Reminder notifications must fire even when the tab is unfocused.
    refetchIntervalInBackground: true,
  });
}
