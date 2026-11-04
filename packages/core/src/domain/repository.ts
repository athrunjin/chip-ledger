/**
 * 数据仓库接口。界面和业务逻辑只依赖这里，不依赖具体存储（ADR 0005）。
 *
 * 一个仓库实例绑定一位组织者：读取只返回这位组织者的数据，
 * 写入其他组织者的数据时抛 `ForeignOrganizerError`。
 */
import type { Game, LedgerEvent, Player } from "./types";

export class ForeignOrganizerError extends Error {
  override readonly name = "ForeignOrganizerError";
}

export interface GameRepository {
  /** 最新的牌局排在前面。 */
  list(): Promise<Game[]>;
  get(id: string): Promise<Game | undefined>;
  save(game: Game): Promise<void>;
}

export interface PlayerRepository {
  /** 按名字排序。 */
  list(): Promise<Player[]>;
  get(id: string): Promise<Player | undefined>;
  save(player: Player): Promise<void>;
}

/** 账本只追加：故意不提供修改和删除，撤销要追加一条冲正事件。 */
export interface LedgerRepository {
  /** 按发生时间排序。 */
  listByGame(gameId: string): Promise<LedgerEvent[]>;
  /** 事件 ID 已存在时失败，已有记录不会被覆盖。 */
  append(event: LedgerEvent): Promise<void>;
}

/** 这位组织者的全部数据。 */
export interface BackupData {
  readonly games: readonly Game[];
  readonly players: readonly Player[];
  readonly ledgerEvents: readonly LedgerEvent[];
}

export interface RestoreResult {
  /** 新增的记录数。 */
  readonly added: number;
  /** 因 ID 已存在而跳过的记录数。 */
  readonly skipped: number;
}

export interface BackupRepository {
  exportAll(): Promise<BackupData>;
  /** 合并恢复：只新增，ID 已存在的记录保持原样。全部成功或全部不写入。 */
  restore(data: BackupData): Promise<RestoreResult>;
}

export interface Repository {
  readonly games: GameRepository;
  readonly players: PlayerRepository;
  readonly ledger: LedgerRepository;
  readonly backup: BackupRepository;
}
