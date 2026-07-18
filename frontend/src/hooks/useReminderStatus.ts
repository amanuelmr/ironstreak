import { useQuery } from "@tanstack/react-query";

import { getReminderStatus } from "../api/endpoints";
import { qk } from "../api/keys";

export function useReminderStatus() {
  return useQuery({
    queryKey: qk.reminder,
    queryFn: getReminderStatus,
    refetchInterval: 60_000,
  });
}
