import { type BackupData, cents, type LedgerEvent } from "@holdem/core";
import { describe, expect, it } from "vitest";

import { parseBackup, serializeBackup } from "./backup";

const data: BackupData = {
  games: [
    {
      id: "g",
      organizerId: "guest",
      currency: "CNY",
      smallBlindChips: 500,
      bigBlindChips: 1000,
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

describe("backup file", () => {
  it("upgrades version 1 backups with money blinds", () => {
    const legacy = edit((backup) => {
      backup.version = 1;
      const [game] = backup.games as Record<string, unknown>[];
      if (!game) throw new Error("missing game");
      delete game.smallBlindChips;
      delete game.bigBlindChips;
      game.smallBlind = 500;
      game.bigBlind = 1000;
    });
    expect(parseBackup(legacy)).toEqual({ ok: true, data });
  });

  it("keeps stack events", () => {
    const stack: LedgerEvent = {
      id: "s",
      organizerId: "guest",
      gameId: "g",
      occurredAt: 3,
      type: "stack_set",
      playerId: "p",
      chips: 700,
    };
    const withStack = { ...data, ledgerEvents: [...data.ledgerEvents, stack] };
    expect(parseBackup(serializeBackup(withStack, 1))).toEqual({ ok: true, data: withStack });
  });

  it("keeps a game's buy-in settings", () => {
    const [game] = data.games;
    if (!game) throw new Error("missing game");
    const withBuyIn = {
      ...data,
      games: [{ ...game, buyInBigBlinds: 100, handChips: 200, collectorId: "p" }],
    };
    expect(parseBackup(serializeBackup(withBuyIn, 1))).toEqual({ ok: true, data: withBuyIn });
  });

  it("parses back to identical data after serializing", () => {
    expect(parseBackup(serializeBackup(data, 1))).toEqual({ ok: true, data });
  });

  it("rejects files that are not JSON or not backups", () => {
    expect(parseBackup("not json")).toEqual({ ok: false, issue: "invalid" });
    expect(parseBackup("{}")).toEqual({ ok: false, issue: "invalid" });
  });

  it("rejects backups from a newer version", () => {
    const text = edit((backup) => {
      backup.version = 3;
    });
    expect(parseBackup(text)).toEqual({ ok: false, issue: "newer-version" });
  });

  it("rejects non-integer chips", () => {
    const text = edit((backup) => {
      (backup.games as [{ smallBlindChips: number }])[0].smallBlindChips = 1.5;
    });
    expect(parseBackup(text)).toEqual({ ok: false, issue: "invalid" });
  });

  it("rejects references to missing players or events", () => {
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
