import { useQuery } from "@tanstack/react-query";

import { getChallenge } from "../api/endpoints";
import { qk } from "../api/keys";

export function useChallenge(id: number, enabled: boolean) {
  return useQuery({
    queryKey: qk.challenge(id),
    queryFn: () => getChallenge(id),
    enabled,
  });
}
