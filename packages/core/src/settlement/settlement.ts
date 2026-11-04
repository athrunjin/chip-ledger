/** Settlement: balance check, each player's result in cash, and transfers. */
import type { ChipRatio } from "../domain";
import { chipsToCents, type PlayerLedger } from "../ledger";
import { allocate, type Cents, cents, InvalidMoneyError, ZERO } from "../money";

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
 * Each player's result in cash. Rounding per player would be a few cents off when the ratio does not divide evenly,
 * so the winners' total comes first, then `allocate` shares it across winners and losers so everyone adds up to exactly 0.
 * Only for books whose chips already balance.
 */
export function netCents(players: readonly PlayerLedger[], ratio: ChipRatio): PlayerNet[] {
  if (chipDifference(players) !== 0) {
    throw new InvalidMoneyError("The books do not balance, so results cannot be converted");
  }
  const chips = players.map((p) => ({ id: p.playerId, net: p.cashedOutChips - p.boughtChips }));
  const winners = chips.filter((p) => p.net > 0);
  const losers = chips.filter((p) => p.net < 0);
  if (winners.length === 0) return chips.map((p) => ({ playerId: p.id, net: ZERO }));

  const total = chipsToCents(
    winners.reduce((sum, p) => sum + p.net, 0),
    ratio,
  );
  const shares = new Map<string, Cents>();
  allocate(
    total,
    winners.map((p) => p.net),
  ).forEach((share, i) => {
    const winner = winners[i];
    if (winner) shares.set(winner.id, share);
  });
  allocate(
    total,
    losers.map((p) => -p.net),
  ).forEach((share, i) => {
    const loser = losers[i];
    if (loser) shares.set(loser.id, cents(-share));
  });
  return chips.map((p) => ({ playerId: p.id, net: shares.get(p.id) ?? ZERO }));
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
