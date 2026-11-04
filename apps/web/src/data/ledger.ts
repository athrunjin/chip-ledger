import type { LedgerEvent } from "@holdem/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GUEST_ORGANIZER_ID, repository } from ".";

export function newEventMeta(gameId: string) {
  return {
    id: crypto.randomUUID(),
    organizerId: GUEST_ORGANIZER_ID,
    gameId,
    occurredAt: Date.now(),
  };
}

export function useLedger(gameId: string) {
  return useQuery({
    queryKey: ["ledger", gameId, "events"],
    queryFn: () => repository.ledger.listByGame(gameId),
  });
}

export function useAppendEvent(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (event: LedgerEvent) => repository.ledger.append(event),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}
