/** 结算：平衡核对、每人输赢换算现金、转账方案。 */
import type { ChipRatio } from "../domain";
import { chipsToCents, type PlayerLedger } from "../ledger";
import { allocate, type Cents, cents, InvalidMoneyError, ZERO } from "../money";

export interface BalanceAdjustments {
  readonly rakeChips: number;
  readonly insuranceChips: number;
}

const NO_ADJUSTMENTS: BalanceAdjustments = { rakeChips: 0, insuranceChips: 0 };

/**
 * 平衡差额：所有人输赢 + 抽水 + 保险盈亏，平衡时等于 0。
 * 正数表示兑出比买入多。M3、M4 之前抽水和保险都是 0。
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
  /** 正数赢，负数输。 */
  readonly net: Cents;
}

/**
 * 每人输赢的现金。比例除不尽时逐人取整会差几分，所以先算出赢家总额，
 * 再用 `allocate` 分给赢家和输家，保证所有人之和严格为 0。
 * 只能用于筹码已经平衡的账目。
 */
export function netCents(players: readonly PlayerLedger[], ratio: ChipRatio): PlayerNet[] {
  if (chipDifference(players) !== 0) {
    throw new InvalidMoneyError("账目不平衡，不能换算输赢");
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
 * 转账方案：每次让欠得最多的人转给赢得最多的人。每一笔至少结清一个人，
 * 所以最多 n−1 笔。严格最少笔数是 NP 难问题，不追求。
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
