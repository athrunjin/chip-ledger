import {
  ForeignOrganizerError,
  type Game,
  type LedgerEvent,
  type LegacyGame,
  type OrganizerId,
  type Player,
  type Repository,
  type RestoreResult,
  upgradeLegacyGame,
} from "@holdem/core";
import Dexie, { type Table } from "dexie";

export type GuestDatabase = Dexie & {
  games: Table<Game, string>;
  players: Table<Player, string>;
  ledgerEvents: Table<LedgerEvent, string>;
};

const STORES = {
  games: "id, [organizerId+createdAt]",
  players: "id, [organizerId+name]",
  ledgerEvents: "id, [gameId+occurredAt]",
};

export function createGuestDatabase(name = "holdem-guest"): GuestDatabase {
  const db = new Dexie(name) as GuestDatabase;
  db.version(1).stores(STORES);
  // Blinds moved from money to chips (ADR 0011)
  db.version(2)
    .stores(STORES)
    .upgrade((tx) =>
      tx
        .table<LegacyGame | Game>("games")
        .toCollection()
        .modify((game, ref) => {
          if ("smallBlind" in game) ref.value = upgradeLegacyGame(game);
        }),
    );
  return db;
}

/** Guest mode repository: data lives only in local IndexedDB. */
export function createDexieRepository(db: GuestDatabase, organizerId: OrganizerId): Repository {
  function assertOwned(entity: { readonly organizerId: OrganizerId }) {
    if (entity.organizerId !== organizerId) {
      throw new ForeignOrganizerError(
        `Cannot write data belonging to another organizer: ${entity.organizerId}`,
      );
    }
  }

  function onlyOwned<T extends { readonly organizerId: OrganizerId }>(entity: T | undefined) {
    return entity?.organizerId === organizerId ? entity : undefined;
  }

  /** Writes only records missing from the table and returns how many were added. */
  async function addMissing<T extends { readonly id: string }>(
    table: Table<T, string>,
    rows: readonly T[],
  ) {
    const existing = await table.bulkGet(rows.map(({ id }) => id));
    const missing = rows.filter((_, i) => existing[i] === undefined);
    await table.bulkAdd(missing);
    return missing.length;
  }

  const ofOrganizer = [
    [organizerId, Dexie.minKey],
    [organizerId, Dexie.maxKey],
  ] as const;

  return {
    games: {
      list: () =>
        db.games
          .where("[organizerId+createdAt]")
          .between(...ofOrganizer)
          .reverse()
          .toArray(),
      get: (id) => db.games.get(id).then(onlyOwned),
      save: async (game) => {
        assertOwned(game);
        await db.games.put(game);
      },
    },
    players: {
      list: () =>
        db.players
          .where("[organizerId+name]")
          .between(...ofOrganizer)
          .toArray(),
      get: (id) => db.players.get(id).then(onlyOwned),
      save: async (player) => {
        assertOwned(player);
        await db.players.put(player);
      },
    },
    ledger: {
      listByGame: (gameId) =>
        db.ledgerEvents
          .where("[gameId+occurredAt]")
          .between([gameId, Dexie.minKey], [gameId, Dexie.maxKey])
          .filter((event) => event.organizerId === organizerId)
          .toArray(),
      append: async (event) => {
        assertOwned(event);
        await db.ledgerEvents.add(event);
      },
      appendAll: async (events) => {
        events.forEach(assertOwned);
        await db.transaction("rw", db.ledgerEvents, () => db.ledgerEvents.bulkAdd([...events]));
      },
    },
    backup: {
      exportAll: async () => ({
        games: await db.games
          .where("[organizerId+createdAt]")
          .between(...ofOrganizer)
          .toArray(),
        players: await db.players
          .where("[organizerId+name]")
          .between(...ofOrganizer)
          .toArray(),
        ledgerEvents: await db.ledgerEvents.filter((e) => e.organizerId === organizerId).toArray(),
      }),
      restore: async ({ games, players, ledgerEvents }): Promise<RestoreResult> => {
        [...games, ...players, ...ledgerEvents].forEach(assertOwned);
        const total = games.length + players.length + ledgerEvents.length;
        const added = await db.transaction(
          "rw",
          db.games,
          db.players,
          db.ledgerEvents,
          async () =>
            (await addMissing(db.games, games)) +
            (await addMissing(db.players, players)) +
            (await addMissing(db.ledgerEvents, ledgerEvents)),
        );
        return { added, skipped: total - added };
      },
    },
  };
}
