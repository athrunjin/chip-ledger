import { type ChipRatio, type Currency, chipsToCents, type PlayerLedger } from "@holdem/core";
import { formatGameMoney } from "@/lib/currency";

const actionClass = "min-h-11 rounded-lg border border-line px-3 text-sm font-medium";

interface LedgerPlayersProps {
  players: readonly PlayerLedger[];
  nameOf: (playerId: string) => string;
  ratio: ChipRatio;
  currency: Currency;
  /** 牌局已结算时不再显示操作 */
  editable: boolean;
  onRebuy: (playerId: string) => void;
  onCashOut: (playerId: string) => void;
}

export function LedgerPlayers({
  players,
  nameOf,
  ratio,
  currency,
  editable,
  onRebuy,
  onCashOut,
}: LedgerPlayersProps) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {players.map(({ playerId, boughtChips, cashedOutChips, seated }) => (
        <li key={playerId} className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate font-medium">{nameOf(playerId)}</span>
            <span className="shrink-0 text-sm text-muted">{seated ? "在桌" : "已离桌"}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            买入 {boughtChips.toLocaleString("zh-CN")}（
            {formatGameMoney(chipsToCents(boughtChips, ratio), currency)}）
            {cashedOutChips > 0 && ` · 兑出 ${cashedOutChips.toLocaleString("zh-CN")}`}
          </p>
          {editable && (
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => onRebuy(playerId)} className={actionClass}>
                补码
              </button>
              {seated && (
                <button type="button" onClick={() => onCashOut(playerId)} className={actionClass}>
                  兑出
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
