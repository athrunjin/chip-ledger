/**
 * Repository interfaces. UI and business logic depend on these, not on specific storage (ADR 0005).
 *
 * One repository instance is bound to one organizer: reads return only that organizer's data,
 * and writing another organizer's data throws `ForeignOrganizerError`.
 */
import type { Game, LedgerEvent, Player, SavedInsuranceRule } from "./types";

export class ForeignOrganizerError extends Error {
  override readonly name = "ForeignOrganizerError";
}

export interface GameRepository {
  /** Newest games first. */
  list(): Promise<Game[]>;
  get(id: string): Promise<Game | undefined>;
  save(game: Game): Promise<void>;
}

export interface PlayerRepository {
  /** Sorted by name. */
  list(): Promise<Player[]>;
  get(id: string): Promise<Player | undefined>;
  save(player: Player): Promise<void>;
}

export interface InsuranceRuleRepository {
  /** Oldest first. */
  list(): Promise<SavedInsuranceRule[]>;
  save(rule: SavedInsuranceRule): Promise<void>;
  /** Games keep their own copy of the rule, so deleting one changes no game. */
  remove(id: string): Promise<void>;
}

/** The ledger is append-only: there is deliberately no update or delete, and undoing means appending a reversal event. */
export interface LedgerRepository {
  /** Sorted by time of occurrence. */
  listByGame(gameId: string): Promise<LedgerEvent[]>;
  /** Fails if the event ID exists, so existing records are never overwritten. */
  append(event: LedgerEvent): Promise<void>;
  /** Appends several events at once: all are written or none are. */
  appendAll(events: readonly LedgerEvent[]): Promise<void>;
}

/** All of this organizer's data. */
export interface BackupData {
  readonly games: readonly Game[];
  readonly players: readonly Player[];
  readonly ledgerEvents: readonly LedgerEvent[];
  readonly insuranceRules: readonly SavedInsuranceRule[];
}

export interface RestoreResult {
  /** Number of records added. */
  readonly added: number;
  /** Number of records skipped because their ID exists. */
  readonly skipped: number;
}

export interface BackupRepository {
  exportAll(): Promise<BackupData>;
  /** Merging restore: only adds records, leaving existing IDs as they are. All are written or none are. */
  restore(data: BackupData): Promise<RestoreResult>;
}

export interface Repository {
  readonly games: GameRepository;
  readonly players: PlayerRepository;
  readonly ledger: LedgerRepository;
  readonly insuranceRules: InsuranceRuleRepository;
  readonly backup: BackupRepository;
}
