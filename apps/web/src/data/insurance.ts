import {
  type Game,
  INSURANCE_PLAYER_ID,
  type InsuranceBuyEvent,
  type InsuranceRecord,
  insuranceSeatChange,
  insuranceTopUp,
  type LedgerEvent,
  latestCashOut,
  type SavedInsuranceRule,
  summarizeByPlayer,
} from "@holdem/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GUEST_ORGANIZER_ID, repository } from ".";
import { newEventMeta } from "./ledger";

const RULES_KEY = ["insurance-rules"] as const;

export function useInsuranceRules() {
  return useQuery({ queryKey: RULES_KEY, queryFn: () => repository.insuranceRules.list() });
}

export function newSavedRule(name: string, rule: SavedInsuranceRule["rule"]): SavedInsuranceRule {
  return {
    id: crypto.randomUUID(),
    organizerId: GUEST_ORGANIZER_ID,
    name,
    rule,
    createdAt: Date.now(),
  };
}

export function useSaveInsuranceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: SavedInsuranceRule) => repository.insuranceRules.save(rule),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

export function useRemoveInsuranceRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.insuranceRules.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RULES_KEY }),
  });
}

/** Events that bring the insurance seat in line with the game's settings. */
export function seatEvents(game: Game, events: readonly LedgerEvent[]): LedgerEvent[] {
  const { reversedEventIds, buyInChips } = insuranceSeatChange(game, events);
  const occurredAt = Date.now();
  return [
    ...reversedEventIds.map(
      (reversedEventId): LedgerEvent => ({
        ...newEventMeta(game.id, occurredAt),
        type: "reversal",
        reversedEventId,
      }),
    ),
    ...(buyInChips === undefined
      ? []
      : [
          {
            ...newEventMeta(game.id, occurredAt),
            type: "buy_in" as const,
            playerId: INSURANCE_PLAYER_ID,
            chips: buyInChips,
          },
        ]),
  ];
}

/** Insurance is sold after a settle attempt seated everyone out, so the seat comes back first. */
function reseat(gameId: string, events: readonly LedgerEvent[], occurredAt: number) {
  const cashOut = latestCashOut(events, INSURANCE_PLAYER_ID);
  if (!cashOut) return [];
  return [
    {
      ...newEventMeta(gameId, occurredAt),
      type: "reversal" as const,
      reversedEventId: cashOut.id,
    },
  ];
}

function ledgerScope(gameId: string) {
  return { id: `ledger-${gameId}` };
}

export type InsurancePurchase = Pick<
  InsuranceBuyEvent,
  "playerId" | "chips" | "payoutChips" | "outs" | "oddsHundredths" | "street"
>;

export function useBuyInsurance(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: ledgerScope(gameId),
    mutationFn: async (purchase: InsurancePurchase) => {
      const events = await repository.ledger.listByGame(gameId);
      const occurredAt = Date.now();
      await repository.ledger.appendAll([
        ...reseat(gameId, events, occurredAt),
        { ...newEventMeta(gameId, occurredAt), type: "insurance_buy", ...purchase },
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}

interface SettleInput {
  readonly record: InsuranceRecord;
  readonly hit: boolean;
  readonly handChips: number;
}

export function useSettleInsurance(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: ledgerScope(gameId),
    mutationFn: async ({ record: { purchase }, hit, handChips }: SettleInput) => {
      const events = await repository.ledger.listByGame(gameId);
      const seat = summarizeByPlayer(events).find((p) => p.playerId === INSURANCE_PLAYER_ID);
      const cashOut = latestCashOut(events, INSURANCE_PLAYER_ID);
      const stack = (seat?.stackChips ?? 0) + (cashOut?.chips ?? 0);
      const chips = hit ? purchase.payoutChips : 0;
      const topUp = insuranceTopUp(stack, chips, handChips);
      const occurredAt = Date.now();
      const { id: purchaseId, playerId } = purchase;
      await repository.ledger.appendAll([
        ...reseat(gameId, events, occurredAt),
        ...(topUp > 0
          ? [
              {
                ...newEventMeta(gameId, occurredAt),
                type: "rebuy" as const,
                playerId: INSURANCE_PLAYER_ID,
                chips: topUp,
              },
            ]
          : []),
        {
          ...newEventMeta(gameId, occurredAt),
          type: "insurance_settle",
          purchaseId,
          playerId,
          hit,
          chips,
        },
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}

/** Takes a purchase back, with its result if it has one. Hands added to pay it stay bought. */
export function useUndoInsurance(gameId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: ledgerScope(gameId),
    mutationFn: async ({ purchase, settleId }: InsuranceRecord) => {
      const occurredAt = Date.now();
      await repository.ledger.appendAll(
        [settleId, purchase.id].flatMap((reversedEventId): LedgerEvent[] =>
          reversedEventId
            ? [{ ...newEventMeta(gameId, occurredAt), type: "reversal", reversedEventId }]
            : [],
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger", gameId] }),
  });
}
