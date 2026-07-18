import { useQuery } from "@tanstack/react-query";

import { getStreak } from "../api/endpoints";
import { qk } from "../api/keys";

export function useStreak() {
  return useQuery({ queryKey: qk.streak, queryFn: getStreak });
}
