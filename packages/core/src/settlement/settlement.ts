/** Settlement: balance check, each player's result in cash, and transfers. */
import type { ChipRatio, ImbalanceHandling } from "../domain";
import { chipsToCents, type PlayerLedger } from "../ledger";
import { allocate, type Cents, cents, InvalidMoneyError, sum, ZERO } from "../money";

export interface BalanceAdjustments {
  readonly rakeChips: number;
  readonly insuranceChips: number;
}

const NO_ADJUSTMENTS: BalanceAdjustments = { rakeChips: 0, insuranceChips: 0 };

/**
 * Balance difference: all players' results + rake + insurance profit, which is 0 when balanced.
 * Positive means more was cashed out than bought in. Rake and insurance stay 0 until M3 and M4.
 */
export function chipDifference(
  players: readonly PlayerLedger[],
  { rakeChips, insuranceChips }: BalanceAdjustments = NO_ADJUSTMENTS,
): number {
  const net = players.reduce((total, p) => total + p.cashedOutChips - p.boughtChips, 0);
  return net + rakeChips + insuranceChips;
}

export interface PlayerNet {
  readonly playerId: string;
  /** Positive is a win, negative is a loss. */
  readonly net: Cents;
}

/**
 * Each player's result in cash, before any difference is handled. Rounding per player would be a few cents off
 * when the ratio does not divide evenly, so each side's total comes first and `allocate` shares it out.
 */
function rawNetCents(players: readonly PlayerLedger[], ratio: ChipRatio): PlayerNet[] {
  const chips = players.map((p) => ({ id: p.playerId, net: p.cashedOutChips - p.boughtChips }));
  const shares = new Map<string, Cents>();
  for (const sign of [1, -1]) {
    const side = chips.filter((p) => p.net * sign > 0);
    if (side.length === 0) continue;
    const sizes = side.map((p) => Math.abs(p.net));
    const total = chipsToCents(
      sizes.reduce((sum, size) => sum + size, 0),
      ratio,
    );
    allocate(total, sizes).forEach((share, i) => {
      const player = side[i];
      if (player) shares.set(player.id, cents(share * sign));
    });
  }
  return chips.map((p) => ({ playerId: p.id, net: shares.get(p.id) ?? ZERO }));
}

/** Each player's result in cash, adding up to exactly 0. Only for books whose chips already balance. */
export function netCents(players: readonly PlayerLedger[], ratio: ChipRatio): PlayerNet[] {
  if (chipDifference(players) !== 0) {
    throw new InvalidMoneyError("The books do not balance, so results cannot be converted");
  }
  return rawNetCents(players, ratio);
}

export const IMBALANCE_HANDLINGS: readonly ImbalanceHandling[] = ["split", "organizer", "ignore"];

export interface SettlementOutcome {
  /** Results after handling any difference. An organizer who covers it appears as `ORGANIZER_COLLECTOR`. */
  readonly nets: readonly PlayerNet[];
  /** Cash difference before handling. Positive means players are owed more than others lost. */
  readonly difference: Cents;
  /** The part of the difference left unhandled. */
  readonly unresolved: Cents;
}

/**
 * Takes the difference off the side that is too large, in proportion to each player's result.
 * With 200 too much, winners of 3000 and 1000 give up 150 and 50. With too little, losers pay less.
 */
function splitDifference(raw: readonly PlayerNet[], difference: Cents): PlayerNet[] {
  const sign = Math.sign(difference);
  const side = raw.filter((p) => p.net * sign > 0);
  const shares = new Map<string, Cents>();
  allocate(
    cents(Math.abs(difference)),
    side.map((p) => Math.abs(p.net)),
  ).forEach((share, i) => {
    const player = side[i];
    if (player) shares.set(player.playerId, share);
  });
  return raw.map(({ playerId, net }) => ({
    playerId,
    net: cents(net - sign * (shares.get(playerId) ?? ZERO)),
  }));
}

/** Works out results for any books. Unbalanced books with no handling chosen stay unhandled. */
export function settlementOutcome(
  players: readonly PlayerLedger[],
  ratio: ChipRatio,
  handling: ImbalanceHandling | undefined,
): SettlementOutcome {
  const raw = rawNetCents(players, ratio);
  const difference = sum(raw.map((p) => p.net));
  if (difference === 0) return { nets: raw, difference, unresolved: ZERO };

  if (handling === "split") {
    return { nets: splitDifference(raw, difference), difference, unresolved: ZERO };
  }
  if (handling === "organizer") {
    const organizer = { playerId: ORGANIZER_COLLECTOR, net: cents(-difference) };
    return { nets: [...raw, organizer], difference, unresolved: ZERO };
  }
  return { nets: raw, difference, unresolved: difference };
}

export interface Transfer {
  readonly from: string;
  readonly to: string;
  readonly amount: Cents;
}

function largest(balances: Map<string, number>, sign: 1 | -1): [string, number] | undefined {
  let best: [string, number] | undefined;
  for (const [id, balance] of balances) {
    if (balance * sign > 0 && (!best || balance * sign > best[1] * sign)) best = [id, balance];
  }
  return best;
}

/**
 * Transfers: each step has the biggest debtor pay the biggest winner. Every transfer settles at least one person,
 * so there are at most n−1. A strictly minimal count is NP-hard and not attempted.
 */
export function settleTransfers(nets: readonly PlayerNet[]): Transfer[] {
  const balances = new Map<string, number>(nets.map((p) => [p.playerId, p.net]));
  const transfers: Transfer[] = [];
  for (;;) {
    const creditor = largest(balances, 1);
    const debtor = largest(balances, -1);
    if (!creditor || !debtor) return transfers;
    const amount = Math.min(creditor[1], -debtor[1]);
    transfers.push({ from: debtor[0], to: creditor[0], amount: cents(amount) });
    balances.set(creditor[0], creditor[1] - amount);
    balances.set(debtor[0], debtor[1] + amount);
  }
}

/** The collector is an organizer who is not playing, rather than a player ID. */
export const ORGANIZER_COLLECTOR = "organizer";

/** Transfers through one person: every loser pays the collector, who pays every winner. */
export function collectorTransfers(nets: readonly PlayerNet[], collectorId: string): Transfer[] {
  return nets
    .filter((p) => p.playerId !== collectorId && p.net !== 0)
    .toSorted((a, b) => a.net - b.net)
    .map(({ playerId, net }) =>
      net < 0
        ? { from: playerId, to: collectorId, amount: cents(-net) }
        : { from: collectorId, to: playerId, amount: net },
    );
}

/** A collector no longer in the game, for example after reopening it, falls back to the optimal plan. */
export function isValidCollector(nets: readonly PlayerNet[], collectorId: string | undefined) {
  return (
    collectorId === ORGANIZER_COLLECTOR || nets.some(({ playerId }) => playerId === collectorId)
  );
}
