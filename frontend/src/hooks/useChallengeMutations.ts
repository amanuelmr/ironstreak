import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addChallengeEntry,
  createChallenge,
  deleteChallenge,
  deleteChallengeEntry,
  updateChallenge,
} from "../api/endpoints";
import { qk } from "../api/keys";
import type { ChallengeEntryPayload, ChallengeUpdatePayload } from "../types";

export function useChallengeMutations() {
  const queryClient = useQueryClient();

  const invalidateGlobal = () => {
    void queryClient.invalidateQueries({ queryKey: ["challenges"] });
    void queryClient.invalidateQueries({ queryKey: qk.overview });
    void queryClient.invalidateQueries({ queryKey: ["activity"] });
  };
  const invalidateOne = (id: number) => {
    void queryClient.invalidateQueries({ queryKey: qk.challenge(id) });
    invalidateGlobal();
  };

  const create = useMutation({
    mutationFn: createChallenge,
    onSuccess: () => invalidateGlobal(),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ChallengeUpdatePayload }) =>
      updateChallenge(id, patch),
    onSuccess: (_data, vars) => invalidateOne(vars.id),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteChallenge(id),
    onSuccess: () => invalidateGlobal(),
  });

  const addEntry = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChallengeEntryPayload }) =>
      addChallengeEntry(id, payload),
    onSuccess: (_data, vars) => invalidateOne(vars.id),
  });

  const removeEntry = useMutation({
    mutationFn: ({ id, entryId }: { id: number; entryId: number }) =>
      deleteChallengeEntry(id, entryId),
    onSuccess: (_data, vars) => invalidateOne(vars.id),
  });

  return { create, update, remove, addEntry, removeEntry };
}
