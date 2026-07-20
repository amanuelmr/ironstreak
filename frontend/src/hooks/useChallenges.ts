import { useQuery } from "@tanstack/react-query";

import { getChallenges } from "../api/endpoints";
import { qk } from "../api/keys";
import type { ChallengeStatus } from "../types";

export function useChallenges(status?: ChallengeStatus) {
  return useQuery({ queryKey: qk.challenges(status), queryFn: () => getChallenges(status) });
}
