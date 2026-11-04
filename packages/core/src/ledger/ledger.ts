/**
 * 账本推导。账本只追加事件（ADR 0005），余额全部从事件算出来。
 * 结果都以筹码为单位；显示现金时用 `chipsToCents` 换算。
 */
import type { ChipEvent, ChipRatio, LedgerEvent } from "../domain";
import { type Cents, multiply } from "../money";

function reversedEventIds(events: readonly LedgerEvent[]): Set<string> {
  return new Set(events.flatMap((e) => (e.type === "reversal" ? [e.reversedEventId] : [])));
}

/** 没有被冲正的买入、补码、兑出，保持原有顺序。 */
export function activeChipEvents(events: readonly LedgerEvent[]): ChipEvent[] {
  const reversed = reversedEventIds(events);
  return events.filter((e): e is ChipEvent => e.type !== "reversal" && !reversed.has(e.id));
}

/** 只有还没被冲正的筹码事件可以撤销；冲正本身不能再撤销，重新记一笔即可。 */
export function canReverse(events: readonly LedgerEvent[], eventId: string): boolean {
  return activeChipEvents(events).some((e) => e.id === eventId);
}

export interface PlayerLedger {
  readonly playerId: string;
  /** 买入和补码的总筹码。 */
  readonly boughtChips: number;
  /** 兑出的总筹码。 */
  readonly cashedOutChips: number;
  /** 是否还在桌上：最后一笔不是兑出。 */
  readonly seated: boolean;
}

/** 每位玩家的账目，按首次买入的顺序排列。 */
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
  /** 还在桌上的筹码：买入 − 兑出。 */
  readonly inPlayChips: number;
}

export function ledgerTotals(players: readonly PlayerLedger[]): LedgerTotals {
  const boughtChips = players.reduce((total, p) => total + p.boughtChips, 0);
  const cashedOutChips = players.reduce((total, p) => total + p.cashedOutChips, 0);
  return { boughtChips, cashedOutChips, inPlayChips: boughtChips - cashedOutChips };
}

/** 这位玩家的下一笔买入是首次买入还是补码。 */
export function nextBuyType(events: readonly LedgerEvent[], playerId: string): "buy_in" | "rebuy" {
  return activeChipEvents(events).some((e) => e.playerId === playerId) ? "rebuy" : "buy_in";
}

/** 最近一笔买入或补码的筹码数，用来预填下一笔。没有时返回 undefined。 */
export function lastBuyChips(events: readonly LedgerEvent[]): number | undefined {
  return activeChipEvents(events).findLast((e) => e.type !== "cash_out")?.chips;
}

/** 手数变化：`by` 在现有基础上加减，`to` 直接改成目标手数。 */
export type HandChange = { readonly by: number } | { readonly to: number };

/** 账本只追加，调整手数要拆成冲正和一笔新的买入。 */
export interface HandAdjustment {
  readonly reversedEventIds: readonly string[];
  readonly buy?: { readonly type: "buy_in" | "rebuy"; readonly chips: number };
}

/**
 * 算出把玩家调整到目标手数要追加哪些事件。最少保留 1 手。
 *
 * 增加时记一笔差额。减少时从最近的买入往回冲正，冲过头的部分再记一笔补回来。
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

/** 按牌局比例把筹码换算成现金，四舍五入到分。 */
export function chipsToCents(chips: number, ratio: ChipRatio): Cents {
  return multiply(ratio.amount, chips / ratio.chips, "half-up");
}
