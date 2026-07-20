import { useQuery } from "@tanstack/react-query";

import { getOverview } from "../api/endpoints";
import { qk } from "../api/keys";

export function useOverview() {
  return useQuery({ queryKey: qk.overview, queryFn: getOverview });
}
