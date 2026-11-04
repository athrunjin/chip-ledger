import "fake-indexeddb/auto";

import {
  cents,
  ForeignOrganizerError,
  type Game,
  type LedgerEvent,
  type Player,
  type Repository,
} from "@holdem/core";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDexieRepository, createGuestDatabase, type GuestDatabase } from "./dexie-repository";

const game = (id: string, organizerId: string, createdAt: number): Game => ({
  id,
  organizerId,
  currency: "AUD",
  smallBlind: cents(100),
  bigBlind: cents(200),
  chipRatio: { chips: 100, amount: cents(100) },
  status: "open",
  createdAt,
});

const player = (id: string, organizerId: string, name: string): Player => ({
  id,
  organizerId,
  name,
  initials: name.toLowerCase(),
  createdAt: 1,
});

const buyIn = (
  id: string,
  organizerId: string,
  gameId: string,
  occurredAt: number,
): LedgerEvent => ({
  id,
  organizerId,
  gameId,
  occurredAt,
  type: "buy_in",
  playerId: "p1",
  chips: 1000,
});

describe("Dexie repository", () => {
  let db: GuestDatabase;
  let repository: Repository;
  let other: Repository;

  beforeEach(() => {
    db = createGuestDatabase(`test-${crypto.randomUUID()}`);
    repository = createDexieRepository(db, "me");
    other = createDexieRepository(db, "other");
  });

  afterEach(async () => {
    await Dexie.delete(db.name);
  });

  it("lists games newest first and updates on saving the same ID", async () => {
    await repository.games.save(game("old", "me", 1));
    await repository.games.save(game("new", "me", 2));
    await repository.games.save({ ...game("old", "me", 1), status: "settled" });

    const games = await repository.games.list();
    expect(games.map((g) => g.id)).toEqual(["new", "old"]);
    expect((await repository.games.get("old"))?.status).toBe("settled");
  });

  it("sorts players by name", async () => {
    await repository.players.save(player("b", "me", "Bob"));
    await repository.players.save(player("a", "me", "Alice"));

    expect((await repository.players.list()).map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("sorts ledger events by time and returns only this game's", async () => {
    await repository.ledger.append(buyIn("later", "me", "g1", 2));
    await repository.ledger.append(buyIn("earlier", "me", "g1", 1));
    await repository.ledger.append(buyIn("elsewhere", "me", "g2", 1));

    const events = await repository.ledger.listByGame("g1");
    expect(events.map((e) => e.id)).toEqual(["earlier", "later"]);
  });

  it("does not let the same ID overwrite a ledger event", async () => {
    await repository.ledger.append(buyIn("e1", "me", "g1", 1));

    await expect(repository.ledger.append(buyIn("e1", "me", "g1", 2))).rejects.toThrow();
    const events = await repository.ledger.listByGame("g1");
    expect(events.map((e) => e.occurredAt)).toEqual([1]);
  });

  it("writes nothing if one event in a batch fails", async () => {
    await repository.ledger.append(buyIn("e1", "me", "g1", 1));

    await expect(
      repository.ledger.appendAll([buyIn("e2", "me", "g1", 2), buyIn("e1", "me", "g1", 3)]),
    ).rejects.toThrow();
    const events = await repository.ledger.listByGame("g1");
    expect(events.map((e) => e.id)).toEqual(["e1"]);
  });

  it("hides other organizers' data from reads", async () => {
    await other.games.save(game("g", "other", 1));
    await other.players.save(player("p", "other", "Eve"));
    await other.ledger.append(buyIn("e", "other", "g", 1));

    expect(await repository.games.list()).toEqual([]);
    expect(await repository.games.get("g")).toBeUndefined();
    expect(await repository.players.list()).toEqual([]);
    expect(await repository.players.get("p")).toBeUndefined();
    expect(await repository.ledger.listByGame("g")).toEqual([]);
  });

  it("restores an export into an empty database with identical data", async () => {
    await repository.games.save(game("g", "me", 1));
    await repository.players.save(player("p", "me", "Alice"));
    await repository.ledger.append(buyIn("e", "me", "g", 1));
    await other.games.save(game("foreign", "other", 1));
    const backup = await repository.backup.exportAll();

    const target = createGuestDatabase(`test-${crypto.randomUUID()}`);
    const restored = createDexieRepository(target, "me");
    expect(await restored.backup.restore(backup)).toEqual({ added: 3, skipped: 0 });
    expect(await restored.backup.exportAll()).toEqual(backup);
    expect(backup.games.map((g) => g.id)).toEqual(["g"]);
    await Dexie.delete(target.name);
  });

  it("skips existing records on restore without overwriting local data", async () => {
    await repository.games.save({ ...game("g", "me", 1), status: "settled" });
    await repository.ledger.append(buyIn("e", "me", "g", 1));

    const result = await repository.backup.restore({
      games: [game("g", "me", 1), game("new", "me", 2)],
      players: [],
      ledgerEvents: [buyIn("e", "me", "g", 99)],
    });

    expect(result).toEqual({ added: 1, skipped: 2 });
    expect((await repository.games.get("g"))?.status).toBe("settled");
    expect((await repository.ledger.listByGame("g")).map((e) => e.occurredAt)).toEqual([1]);
  });

  it("fails to restore another organizer's backup and writes nothing", async () => {
    const restore = repository.backup.restore({
      games: [game("mine", "me", 1), game("theirs", "other", 1)],
      players: [],
      ledgerEvents: [],
    });

    await expect(restore).rejects.toThrow(ForeignOrganizerError);
    expect(await repository.games.list()).toEqual([]);
  });

  it("refuses to write other organizers' data", async () => {
    await expect(repository.games.save(game("g", "other", 1))).rejects.toThrow(
      ForeignOrganizerError,
    );
    await expect(repository.players.save(player("p", "other", "Eve"))).rejects.toThrow(
      ForeignOrganizerError,
    );
    await expect(repository.ledger.append(buyIn("e", "other", "g", 1))).rejects.toThrow(
      ForeignOrganizerError,
    );
  });
});
