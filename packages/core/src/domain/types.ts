/**
 * 领域模型。只有类型，由数据仓库实现负责存取。
 *
 * 每条数据都带组织者 ID，为以后的多组织者、多俱乐部留空间（ADR 0005）。
 */
import type { Cents } from "../money";

/** 毫秒时间戳。计时类数据只记时间戳，用差值计算（ADR 0001）。 */
export type Timestamp = number;

export type OrganizerId = string;

/** ISO 4217 货币代码。 */
export type Currency = "AUD" | "CNY";

/** 筹码与现金的比例：`chips` 个筹码值 `amount`。用一对整数表示，避免小数。 */
export interface ChipRatio {
  readonly chips: number;
  readonly amount: Cents;
}

export type GameStatus = "open" | "settled";

export interface Game {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly currency: Currency;
  readonly smallBlind: Cents;
  readonly bigBlind: Cents;
  readonly chipRatio: ChipRatio;
  readonly status: GameStatus;
  readonly createdAt: Timestamp;
  /** 确认结算的时间。重新打开后清除。 */
  readonly settledAt?: Timestamp;
}

export interface Player {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly name: string;
  /** 名字的拼音首字母，小写，用于搜索。生成方式在应用层，`core` 不依赖拼音库。 */
  readonly initials: string;
  readonly createdAt: Timestamp;
}

interface LedgerEventBase {
  readonly id: string;
  readonly organizerId: OrganizerId;
  readonly gameId: string;
  readonly occurredAt: Timestamp;
}

/** 买入、补码、兑出。金额由筹码数和牌局的筹码比例推导。 */
export interface ChipEvent extends LedgerEventBase {
  readonly type: "buy_in" | "rebuy" | "cash_out";
  readonly playerId: string;
  /** 整数筹码数。 */
  readonly chips: number;
}

/** 冲正：撤销 `reversedEventId` 指向的事件，旧记录保持不变。 */
export interface ReversalEvent extends LedgerEventBase {
  readonly type: "reversal";
  readonly reversedEventId: string;
}

/** 账本事件。只追加，不修改（ADR 0005）。 */
export type LedgerEvent = ChipEvent | ReversalEvent;
