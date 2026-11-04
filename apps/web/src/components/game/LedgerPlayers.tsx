import { type ChipRatio, type Currency, chipsToCents, type PlayerLedger } from "@holdem/core";
import { formatGameMoney } from "@/lib/currency";

const actionClass = "min-h-11 shrink-0 rounded-lg border border-line px-2.5 text-sm font-medium";
const stepClass = "size-11 shrink-0 rounded-lg border border-line text-lg font-semibold";
const listClass = "divide-y divide-line rounded-xl border border-line bg-surface px-3";
const rowClass = "flex min-h-13 items-center gap-2 py-1";

interface LedgerPlayersProps {
  players: readonly PlayerLedger[];
  nameOf: (playerId: string) => string;
  /** 1 手的筹码数。没有时是旧牌局，按筹码记录。 */
  handChips: number | undefined;
  ratio: ChipRatio;
  currency: Currency;
  /** 牌局已结算时不再显示操作 */
  editable: boolean;
  onStepHands: (playerId: string, by: number) => void;
  onEditHands: (playerId: string) => void;
  onRebuy: (playerId: string) => void;
  onCashOut: (playerId: string) => void;
}

export function LedgerPlayers({
  players,
  nameOf,
  handChips,
  ratio,
  currency,
  editable,
  onStepHands,
  onEditHands,
  onRebuy,
  onCashOut,
}: LedgerPlayersProps) {
  const seated = players.filter((p) => p.seated);
  const left = players.filter((p) => !p.seated);
  const money = (chips: number) => formatGameMoney(chipsToCents(chips, ratio), currency);

  function hands({ playerId, boughtChips }: PlayerLedger) {
    if (handChips === undefined) {
      return (
        editable && (
          <button type="button" onClick={() => onRebuy(playerId)} className={actionClass}>
            补码
          </button>
        )
      );
    }
    const count = boughtChips / handChips;
    if (!editable) return <span className="shrink-0 font-semibold">{count} 手</span>;
    const name = nameOf(playerId);
    return (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label={`${name}减 1 手`}
          disabled={count <= 1}
          onClick={() => onStepHands(playerId, -1)}
          className={`${stepClass} disabled:opacity-40`}
        >
          −
        </button>
        <button
          type="button"
          aria-label={`输入${name}的手数，现在 ${count} 手`}
          onClick={() => onEditHands(playerId)}
          className="min-h-11 min-w-11 text-lg font-semibold tabular-nums"
        >
          {count}
        </button>
        <button
          type="button"
          aria-label={`${name}加 1 手`}
          onClick={() => onStepHands(playerId, 1)}
          className={stepClass}
        >
          +
        </button>
      </div>
    );
  }

  return (
    <>
      {seated.length > 0 && (
        <ul aria-label="在局玩家" className={`mt-3 ${listClass}`}>
          {seated.map((player) => (
            <li key={player.playerId} className={rowClass}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{nameOf(player.playerId)}</p>
                <p className="truncate text-xs text-muted">
                  买入 {money(player.boughtChips)}
                  {player.cashedOutChips > 0 && ` · 兑出 ${money(player.cashedOutChips)}`}
                </p>
              </div>
              {hands(player)}
              {editable && (
                <button
                  type="button"
                  aria-label={`${nameOf(player.playerId)}兑出`}
                  onClick={() => onCashOut(player.playerId)}
                  className={actionClass}
                >
                  兑出
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {left.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-1 text-sm font-medium text-muted">已离桌（{left.length}）</h2>
          <ul className={`${listClass} border-dashed bg-transparent`}>
            {left.map(({ playerId, boughtChips, cashedOutChips }) => (
              <li key={playerId} className={`${rowClass} text-muted`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nameOf(playerId)}</p>
                  <p className="truncate text-xs">
                    买入 {money(boughtChips)} · 兑出 {money(cashedOutChips)}
                  </p>
                </div>
                {editable && (
                  <button
                    type="button"
                    aria-label={`${nameOf(playerId)}补码入座`}
                    onClick={() => onRebuy(playerId)}
                    className={actionClass}
                  >
                    补码
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
