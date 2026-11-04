import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { PlayerLedger } from "../ledger";
import { cents, sum } from "../money";
import { chipDifference, netCents, type PlayerNet, settleTransfers } from "./settlement";

const ledger = (playerId: string, boughtChips: number, cashedOutChips: number): PlayerLedger => ({
  playerId,
  boughtChips,
  cashedOutChips,
  seated: false,
});

const net = (playerId: string, value: number): PlayerNet => ({ playerId, net: cents(value) });

/** 随机的平衡账目：每人买入后筹码在玩家之间随机转移。 */
const balancedLedgers = fc
  .array(
    fc.record({
      bought: fc.integer({ min: 1, max: 100_000 }),
      moved: fc.integer({ min: 0, max: 100_000 }),
    }),
    { minLength: 2, maxLength: 12 },
  )
  .map((rows) => {
    const players = rows.map(({ bought, moved }, i) => {
      const lost = Math.min(bought, moved);
      return ledger(`p${i}`, bought, bought - lost);
    });
    const pot = players.reduce((total, p) => total + p.boughtChips - p.cashedOutChips, 0);
    return players.map((p, i) => (i === 0 ? { ...p, cashedOutChips: p.cashedOutChips + pot } : p));
  });

const ratios = fc.record({
  chips: fc.integer({ min: 1, max: 1000 }),
  amount: fc.integer({ min: 1, max: 100_000 }).map(cents),
});

describe("chipDifference", () => {
  it("平衡时为 0", () => {
    expect(chipDifference([ledger("a", 1000, 1500), ledger("b", 1000, 500)])).toBe(0);
  });

  it("兑出多了是正数，少了是负数", () => {
    expect(chipDifference([ledger("a", 1000, 1200)])).toBe(200);
    expect(chipDifference([ledger("a", 1000, 700)])).toBe(-300);
  });

  it("输赢 + 抽水 + 保险盈亏 = 0 时平衡", () => {
    const players = [ledger("a", 1000, 900)];
    expect(chipDifference(players, { rakeChips: 60, insuranceChips: 40 })).toBe(0);
  });
});

describe("netCents", () => {
  it("按比例换算每人输赢", () => {
    const players = [ledger("a", 1000, 1500), ledger("b", 1000, 500)];
    expect(netCents(players, { chips: 100, amount: cents(100) })).toEqual([
      net("a", 500),
      net("b", -500),
    ]);
  });

  it("除不尽时输赢之和仍然为 0", () => {
    const players = [ledger("a", 1, 2), ledger("b", 1, 2), ledger("c", 3, 1)];
    const nets = netCents(players, { chips: 3, amount: cents(100) });
    expect(sum(nets.map((p) => p.net))).toBe(0);
  });

  it("没有输赢时全部为 0", () => {
    expect(netCents([ledger("a", 100, 100)], { chips: 1, amount: cents(1) })).toEqual([
      net("a", 0),
    ]);
  });

  it("账目不平衡时抛错", () => {
    expect(() => netCents([ledger("a", 100, 90)], { chips: 1, amount: cents(1) })).toThrow();
  });

  it("任意平衡账目和比例，输赢之和都为 0", () => {
    fc.assert(
      fc.property(balancedLedgers, ratios, (players, ratio) => {
        expect(sum(netCents(players, ratio).map((p) => p.net))).toBe(0);
      }),
    );
  });
});

describe("settleTransfers", () => {
  it("大债务人先转给大债权人", () => {
    const transfers = settleTransfers([net("a", 700), net("b", 300), net("c", -1000)]);
    expect(transfers).toEqual([
      { from: "c", to: "a", amount: 700 },
      { from: "c", to: "b", amount: 300 },
    ]);
  });

  it("没有输赢时不需要转账", () => {
    expect(settleTransfers([net("a", 0), net("b", 0)])).toEqual([]);
  });

  it("转账之后每个人都清零，笔数不超过 n−1", () => {
    fc.assert(
      fc.property(balancedLedgers, ratios, (players, ratio) => {
        const nets = netCents(players, ratio);
        const transfers = settleTransfers(nets);
        const balances = new Map<string, number>(nets.map((p) => [p.playerId, p.net]));
        for (const { from, to, amount } of transfers) {
          expect(amount).toBeGreaterThan(0);
          balances.set(from, (balances.get(from) ?? 0) + amount);
          balances.set(to, (balances.get(to) ?? 0) - amount);
        }
        expect([...balances.values()].every((b) => b === 0)).toBe(true);
        const active = nets.filter((p) => p.net !== 0).length;
        expect(transfers.length).toBeLessThanOrEqual(Math.max(active - 1, 0));
      }),
    );
  });
});
