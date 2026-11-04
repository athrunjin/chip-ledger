import { type BackupData, cents } from "@holdem/core";
import { describe, expect, it } from "vitest";

import { parseBackup, serializeBackup } from "./backup";

const data: BackupData = {
  games: [
    {
      id: "g",
      organizerId: "guest",
      currency: "CNY",
      smallBlind: cents(500),
      bigBlind: cents(1000),
      chipRatio: { chips: 100, amount: cents(100) },
      status: "settled",
      createdAt: 1,
      settledAt: 2,
    },
  ],
  players: [{ id: "p", organizerId: "guest", name: "张三", initials: "zs", createdAt: 1 }],
  ledgerEvents: [
    {
      id: "e1",
      organizerId: "guest",
      gameId: "g",
      occurredAt: 1,
      type: "buy_in",
      playerId: "p",
      chips: 1000,
    },
    {
      id: "e2",
      organizerId: "guest",
      gameId: "g",
      occurredAt: 2,
      type: "reversal",
      reversedEventId: "e1",
    },
  ],
};

const edit = (change: (backup: Record<string, unknown>) => void) => {
  const backup = JSON.parse(serializeBackup(data, 1));
  change(backup);
  return JSON.stringify(backup);
};

describe("备份文件", () => {
  it("保留牌局的买入设置", () => {
    const [game] = data.games;
    if (!game) throw new Error("缺少牌局");
    const withBuyIn = { ...data, games: [{ ...game, buyInBigBlinds: 100, handChips: 200 }] };
    expect(parseBackup(serializeBackup(withBuyIn, 1))).toEqual({ ok: true, data: withBuyIn });
  });

  it("序列化后再解析，数据完全一致", () => {
    expect(parseBackup(serializeBackup(data, 1))).toEqual({ ok: true, data });
  });

  it("拒绝不是 JSON 或不是备份的文件", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, issue: "invalid" });
    expect(parseBackup("{}")).toEqual({ ok: false, issue: "invalid" });
  });

  it("拒绝更新版本的备份", () => {
    const text = edit((backup) => {
      backup.version = 2;
    });
    expect(parseBackup(text)).toEqual({ ok: false, issue: "newer-version" });
  });

  it("拒绝金额不是整数的数据", () => {
    const text = edit((backup) => {
      (backup.games as [{ smallBlind: number }])[0].smallBlind = 1.5;
    });
    expect(parseBackup(text)).toEqual({ ok: false, issue: "invalid" });
  });

  it("拒绝引用不存在的玩家或事件", () => {
    const missingPlayer = edit((backup) => {
      backup.players = [];
    });
    expect(parseBackup(missingPlayer)).toEqual({ ok: false, issue: "invalid" });
    const missingEvent = edit((backup) => {
      (backup.ledgerEvents as [unknown, { reversedEventId: string }])[1].reversedEventId = "nope";
    });
    expect(parseBackup(missingEvent)).toEqual({ ok: false, issue: "invalid" });
  });
});
