import { type ChipRatio, type Currency, chipsToCents, type PlayerLedger } from "@holdem/core";
import { formatSignedChips, netColor } from "@/lib/chips";
import { formatGameMoney } from "@/lib/currency";

const actionClass = "min-h-11 shrink-0 rounded-lg border border-line px-2 text-sm font-medium";
const stepClass = "size-11 shrink-0 rounded-lg border border-line text-lg font-semibold";
const listClass = "divide-y divide-line rounded-xl border border-line bg-surface px-2";
const rowClass = "flex min-h-13 items-center gap-1.5 py-1";

interface LedgerPlayersProps {
  players: readonly PlayerLedger[];
  nameOf: (playerId: string) => string;
  /** Chips per hand. Missing on older games, which record chips. */
  handChips: number | undefined;
  ratio: ChipRatio;
  currency: Currency;
  /** Actions are hidden once the game is settled */
  editable: boolean;
  onStepHands: (playerId: string, by: number) => void;
  onEditHands: (playerId: string) => void;
  onEditStack: (playerId: string) => void;
  onRebuy: (playerId: string) => void;
  /** Players who can be removed at 1 hand, because they were added by mistake */
  removableIds: ReadonlySet<string>;
  onRemove: (playerId: string) => void;
  onReturn: (playerId: string) => void;
  onLeave: (playerId: string) => void;
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
  onEditStack,
  onRebuy,
  removableIds,
  onRemove,
  onReturn,
  onLeave,
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
    const removable = count <= 1 && removableIds.has(playerId);
    return (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label={removable ? `${name}移出这局` : `${name}减 1 手`}
          disabled={count <= 1 && !removable}
          onClick={() => (removable ? onRemove(playerId) : onStepHands(playerId, -1))}
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
                <p className={`truncate text-xs tabular-nums ${netColor(player.netChips)}`}>
                  {formatSignedChips(player.netChips)}
                </p>
              </div>
              {editable ? (
                <button
                  type="button"
                  aria-label={`输入${nameOf(player.playerId)}的筹码，现在 ${player.stackChips}`}
                  onClick={() => onEditStack(player.playerId)}
                  className="min-h-11 min-w-13 shrink-0 rounded-lg border border-line px-1 text-sm font-semibold tabular-nums"
                >
                  {player.stackChips.toLocaleString("zh-CN")}
                </button>
              ) : (
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {player.stackChips.toLocaleString("zh-CN")}
                </span>
              )}
              {hands(player)}
              {editable && (
                <button
                  type="button"
                  aria-label={`${nameOf(player.playerId)}离桌`}
                  onClick={() => onLeave(player.playerId)}
                  className={actionClass}
                >
                  离桌
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
            {left.map(({ playerId, boughtChips, cashedOutChips, netChips }) => (
              <li key={playerId} className={`${rowClass} text-muted`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nameOf(playerId)}</p>
                  <p className="truncate text-xs">
                    买入 {money(boughtChips)} · 离桌 {money(cashedOutChips)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${netColor(netChips)}`}
                >
                  {formatSignedChips(netChips)}
                </span>
                {editable && (
                  <button
                    type="button"
                    aria-label={`${nameOf(playerId)}返回牌桌`}
                    onClick={() => onReturn(playerId)}
                    className={actionClass}
                  >
                    返回
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
