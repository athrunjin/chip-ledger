import { adjustHands, type HandChange, type LedgerEvent } from "@holdem/core";
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

/** Writes for one game run in a queue, so each rapid tap builds on the previous result. */
function ledgerScope(gameId: string) {
  return { id: `ledger-${gameId}` };
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
    scope: ledgerScope(gameId),
    mutationFn: (event: LedgerEvent) => repository.ledger.append(event),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}

interface HandsInput {
  readonly playerId: string;
  readonly handChips: number;
  readonly change: HandChange;
}

export function useAdjustHands(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: ledgerScope(gameId),
    mutationFn: async ({ playerId, handChips, change }: HandsInput) => {
      const events = await repository.ledger.listByGame(gameId);
      const { reversedEventIds, buy } = adjustHands(events, playerId, handChips, change);
      await repository.ledger.appendAll([
        ...reversedEventIds.map(
          (reversedEventId): LedgerEvent => ({
            ...newEventMeta(gameId),
            type: "reversal",
            reversedEventId,
          }),
        ),
        ...(buy ? [{ ...newEventMeta(gameId), ...buy, playerId }] : []),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}
