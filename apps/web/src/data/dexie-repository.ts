import {
  ForeignOrganizerError,
  type Game,
  type LedgerEvent,
  type OrganizerId,
  type Player,
  type Repository,
} from "@holdem/core";
import Dexie, { type EntityTable } from "dexie";

export type GuestDatabase = Dexie & {
  games: EntityTable<Game, "id">;
  players: EntityTable<Player, "id">;
  ledgerEvents: EntityTable<LedgerEvent, "id">;
};

export function createGuestDatabase(name = "holdem-guest"): GuestDatabase {
  const db = new Dexie(name) as GuestDatabase;
  db.version(1).stores({
    games: "id, [organizerId+createdAt]",
    players: "id, [organizerId+name]",
    ledgerEvents: "id, [gameId+occurredAt]",
  });
  return db;
}

/** 游客模式的数据仓库：数据只存在本机 IndexedDB。 */
export function createDexieRepository(db: GuestDatabase, organizerId: OrganizerId): Repository {
  function assertOwned(entity: { readonly organizerId: OrganizerId }) {
    if (entity.organizerId !== organizerId) {
      throw new ForeignOrganizerError(`不能写入其他组织者的数据：${entity.organizerId}`);
    }
  }

  function onlyOwned<T extends { readonly organizerId: OrganizerId }>(entity: T | undefined) {
    return entity?.organizerId === organizerId ? entity : undefined;
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
    },
  };
}
