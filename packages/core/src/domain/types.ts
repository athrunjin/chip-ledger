/**
 * Domain model. Types only; repository implementations handle storage.
 *
 * Every record carries an organizer ID, leaving room for multiple organizers or clubs (ADR 0005).
 */
import type { Cents } from "../money";

/** Timestamp in milliseconds. Timing data stores timestamps and computes differences (ADR 0001). */
export type Timestamp = number;

export type OrganizerId = string;

/** ISO 4217 currency code. */
export type Currency = "AUD" | "CNY";

/** Chip-to-cash ratio: `chips` chips are worth `amount`. A pair of integers avoids decimals. */
export interface ChipRatio {
  readonly chips: number;
  readonly amount: Cents;
}

export type GameStatus = "open" | "settled";

export interface Game {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly currency: Currency;
  /** Small blind in chips. */
  readonly smallBlindChips: number;
  /** Big blind in chips. */
  readonly bigBlindChips: number;
  readonly chipRatio: ChipRatio;
  /** Big blinds in one buy-in. Games from before this feature lack it and keep recording chips. */
  readonly buyInBigBlinds?: number;
  /** Chips per hand. Fixed once the ledger has events, even if blinds change (ADR 0010). */
  readonly handChips?: number;
  readonly status: GameStatus;
  readonly createdAt: Timestamp;
  /** Who collects and pays out at settlement: a player ID or `ORGANIZER_COLLECTOR`. Missing means the optimal plan. */
  readonly collectorId?: string;
  /** When settlement was confirmed. Cleared on reopening. */
  readonly settledAt?: Timestamp;
}

export interface Player {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly name: string;
  /** Lowercase pinyin initials of the name, for search. Generated in the app layer, so `core` needs no pinyin library. */
  readonly initials: string;
  readonly createdAt: Timestamp;
}

interface LedgerEventBase {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly gameId: string;
  readonly occurredAt: Timestamp;
}

/** A buy-in, rebuy or cash-out. Amounts are derived from chips and the game's chip ratio. */
export interface ChipEvent extends LedgerEventBase {
  readonly type: "buy_in" | "rebuy" | "cash_out";
  readonly playerId: string;
  /** Whole number of chips. */
  readonly chips: number;
}

/** A stack typed in by the organizer, replacing the player's current chips. */
export interface StackSetEvent extends LedgerEventBase {
  readonly type: "stack_set";
  readonly playerId: string;
  /** Whole number of chips. */
  readonly chips: number;
}

/** Reversal: undoes the event `reversedEventId` points to, leaving the old record unchanged. */
export interface ReversalEvent extends LedgerEventBase {
  readonly type: "reversal";
  readonly reversedEventId: string;
}

/** Ledger event. Append-only, never changed (ADR 0005). */
export type LedgerEvent = ChipEvent | StackSetEvent | ReversalEvent;
