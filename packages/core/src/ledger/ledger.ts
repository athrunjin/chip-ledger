/**
 * Ledger derivations. The ledger only appends events (ADR 0005), and all balances are computed from them.
 * Results are in chips; use `chipsToCents` to display cash.
 */
import type { ChipEvent, ChipRatio, LedgerEvent } from "../domain";
import { type Cents, multiply } from "../money";

function reversedEventIds(events: readonly LedgerEvent[]): Set<string> {
  return new Set(events.flatMap((e) => (e.type === "reversal" ? [e.reversedEventId] : [])));
}

/** Buy-ins, rebuys and cash-outs that have not been reversed, in their original order. */
export function activeChipEvents(events: readonly LedgerEvent[]): ChipEvent[] {
  const reversed = reversedEventIds(events);
  return events.filter((e): e is ChipEvent => e.type !== "reversal" && !reversed.has(e.id));
}

/** Only chip events not yet reversed can be undone. A reversal cannot be undone; record the event again instead. */
export function canReverse(events: readonly LedgerEvent[], eventId: string): boolean {
  return activeChipEvents(events).some((e) => e.id === eventId);
}

export interface PlayerLedger {
  readonly playerId: string;
  /** Total chips from buy-ins and rebuys. */
  readonly boughtChips: number;
  /** Total chips cashed out. */
  readonly cashedOutChips: number;
  /** Whether the player is still seated: their last event is not a cash-out. */
  readonly seated: boolean;
}

/** Each player's totals, in order of first buy-in. */
export function summarizeByPlayer(events: readonly LedgerEvent[]): PlayerLedger[] {
  const byPlayer = new Map<string, PlayerLedger>();
  for (const event of activeChipEvents(events)) {
    const { playerId, type, chips } = event;
    const current = byPlayer.get(playerId) ?? {
      playerId,
      boughtChips: 0,
      cashedOutChips: 0,
      seated: true,
    };
    byPlayer.set(
      playerId,
      type === "cash_out"
        ? { ...current, cashedOutChips: current.cashedOutChips + chips, seated: false }
        : { ...current, boughtChips: current.boughtChips + chips, seated: true },
    );
  }
  return [...byPlayer.values()];
}

export interface LedgerTotals {
  readonly boughtChips: number;
  readonly cashedOutChips: number;
  /** Chips still on the table: bought − cashed out. */
  readonly inPlayChips: number;
}

export function ledgerTotals(players: readonly PlayerLedger[]): LedgerTotals {
  const boughtChips = players.reduce((total, p) => total + p.boughtChips, 0);
  const cashedOutChips = players.reduce((total, p) => total + p.cashedOutChips, 0);
  return { boughtChips, cashedOutChips, inPlayChips: boughtChips - cashedOutChips };
}

/** Whether this player's next buy is a first buy-in or a rebuy. */
export function nextBuyType(events: readonly LedgerEvent[], playerId: string): "buy_in" | "rebuy" {
  return activeChipEvents(events).some((e) => e.playerId === playerId) ? "rebuy" : "buy_in";
}

/** Chips in the latest buy-in or rebuy, to prefill the next one. Returns undefined if there is none. */
export function lastBuyChips(events: readonly LedgerEvent[]): number | undefined {
  return activeChipEvents(events).findLast((e) => e.type !== "cash_out")?.chips;
}

/** A change in hands: `by` adds to the current count and `to` sets a target. */
export type HandChange = { readonly by: number } | { readonly to: number };

/** The ledger is append-only, so adjusting hands becomes reversals plus one new buy. */
export interface HandAdjustment {
  readonly reversedEventIds: readonly string[];
  readonly buy?: { readonly type: "buy_in" | "rebuy"; readonly chips: number };
}

/**
 * Works out which events to append to bring a player to the target hands. At least 1 hand remains.
 *
 * An increase records the difference. A decrease reverses the latest buys and records any excess again.
 */
export function adjustHands(
  events: readonly LedgerEvent[],
  playerId: string,
  handChips: number,
  change: HandChange,
): HandAdjustment {
  const buys = activeChipEvents(events).filter(
    (e) => e.playerId === playerId && e.type !== "cash_out",
  );
  const bought = buys.reduce((total, e) => total + e.chips, 0);
  const requested = "to" in change ? change.to * handChips : bought + change.by * handChips;
  const target = Math.max(requested, handChips);

  if (target === bought) return { reversedEventIds: [] };
  if (target > bought) {
    const type = buys.length === 0 ? "buy_in" : "rebuy";
    return { reversedEventIds: [], buy: { type, chips: target - bought } };
  }

  const reversedEventIds: string[] = [];
  let remaining = bought - target;
  for (const buy of buys.toReversed()) {
    if (remaining <= 0) break;
    reversedEventIds.push(buy.id);
    remaining -= buy.chips;
  }
  if (remaining === 0) return { reversedEventIds };
  const type = reversedEventIds.length === buys.length ? "buy_in" : "rebuy";
  return { reversedEventIds, buy: { type, chips: -remaining } };
}

/** Converts chips to cash at the game's ratio, rounded half up to the cent. */
export function chipsToCents(chips: number, ratio: ChipRatio): Cents {
  return multiply(ratio.amount, chips / ratio.chips, "half-up");
}
