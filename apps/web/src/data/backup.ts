import {
  type BackupData,
  type Cents,
  CURRENCIES,
  cents,
  type LegacyGame,
  upgradeLegacyGame,
} from "@holdem/core";
import { z } from "zod";

const FORMAT = "holdem-backup";
const VERSION = 2;

const id = z.string().min(1);
const money = z
  .number()
  .refine(Number.isSafeInteger)
  .transform((value): Cents => cents(value));
const chips = z.number().int().nonnegative();
const timestamp = z.number().int();

const owned = { id, organizerId: id };

const gameFields = {
  ...owned,
  currency: z.enum(CURRENCIES as ["AUD", "CNY"]),
  chipRatio: z.object({ chips: chips.positive(), amount: money }),
  buyInBigBlinds: chips.positive().optional(),
  handChips: chips.positive().optional(),
  collectorId: id.optional(),
  status: z.enum(["open", "settled"]),
  createdAt: timestamp,
  settledAt: timestamp.optional(),
};

const gameSchema = z.object({
  ...gameFields,
  smallBlindChips: chips.positive(),
  bigBlindChips: chips.positive(),
});

/** Version 1 stored blinds as money. */
const legacyGameSchema = z.object({ ...gameFields, smallBlind: money, bigBlind: money });

const playerSchema = z.object({
  ...owned,
  name: z.string().min(1),
  initials: z.string(),
  createdAt: timestamp,
});

const eventBase = { ...owned, gameId: id, occurredAt: timestamp };

const eventSchema = z.discriminatedUnion("type", [
  z.object({
    ...eventBase,
    type: z.enum(["buy_in", "rebuy", "cash_out"]),
    playerId: id,
    chips,
  }),
  z.object({ ...eventBase, type: z.literal("stack_set"), playerId: id, chips }),
  z.object({ ...eventBase, type: z.literal("reversal"), reversedEventId: id }),
]);

const collections = { players: z.array(playerSchema), ledgerEvents: z.array(eventSchema) };

const backupSchema = z.object({ games: z.array(gameSchema), ...collections });
const legacyBackupSchema = z.object({ games: z.array(legacyGameSchema), ...collections });

const envelopeSchema = z.looseObject({ format: z.literal(FORMAT), version: z.number() });

export function serializeBackup(data: BackupData, exportedAt: number): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt, ...data });
}

export type BackupIssue = "invalid" | "newer-version";

export type ParsedBackup =
  | { readonly ok: true; readonly data: BackupData }
  | { readonly ok: false; readonly issue: BackupIssue };

/** Ledger events must point to games and players in the backup, or the books will not balance after a restore. */
function linksAreValid({ games, players, ledgerEvents }: BackupData): boolean {
  const gameIds = new Set(games.map((g) => g.id));
  const playerIds = new Set(players.map((p) => p.id));
  const eventIds = new Set(ledgerEvents.map((e) => e.id));
  return ledgerEvents.every(
    (e) =>
      gameIds.has(e.gameId) &&
      (e.type === "reversal" ? eventIds.has(e.reversedEventId) : playerIds.has(e.playerId)),
  );
}

function parseCurrent(json: unknown): BackupData | null {
  const parsed = backupSchema.safeParse(json);
  return parsed.success ? (parsed.data as BackupData) : null;
}

function parseLegacy(json: unknown): BackupData | null {
  const parsed = legacyBackupSchema.safeParse(json);
  if (!parsed.success) return null;
  const { games, ...rest } = parsed.data as Omit<BackupData, "games"> & {
    games: readonly LegacyGame[];
  };
  return { ...rest, games: games.map(upgradeLegacyGame) };
}

export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, issue: "invalid" };
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, issue: "invalid" };
  if (envelope.data.version > VERSION) return { ok: false, issue: "newer-version" };

  const data = envelope.data.version < VERSION ? parseLegacy(json) : parseCurrent(json);
  if (!data) return { ok: false, issue: "invalid" };
  return linksAreValid(data) ? { ok: true, data } : { ok: false, issue: "invalid" };
}
