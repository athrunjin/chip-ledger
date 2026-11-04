import {
  canReverse,
  chipsToCents,
  type Game,
  lastBuyChips,
  ledgerTotals,
  nextBuyType,
  type Player,
  summarizeByPlayer,
} from "@holdem/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AddPlayerToGame } from "@/components/game/AddPlayerToGame";
import { ChipAmountDialog } from "@/components/game/ChipAmountDialog";
import { LedgerLog } from "@/components/game/LedgerLog";
import { LedgerPlayers } from "@/components/game/LedgerPlayers";
import { Page } from "@/components/Page";
import { useGame } from "@/data/games";
import { newEventMeta, useAppendEvent, useLedger } from "@/data/ledger";
import { usePlayers } from "@/data/players";
import { CURRENCY_INFO, formatGameMoney } from "@/lib/currency";

export const Route = createFileRoute("/games/$gameId/")({
  component: GamePage,
});

function GamePage() {
  const { gameId } = Route.useParams();
  const { data: game, isPending } = useGame(gameId);

  if (isPending) return null;
  if (!game) {
    return (
      <Page title="牌局">
        <p className="text-muted">找不到这局牌。</p>
        <Link to="/" className="mt-2 inline-flex min-h-11 items-center text-highlight">
          回到牌局列表
        </Link>
      </Page>
    );
  }
  return <GameLedger game={game} />;
}

/** 正在记的这一笔 */
type PendingEntry = { kind: "buy" | "cash_out"; playerId: string; name: string };

function GameLedger({ game }: { game: Game }) {
  const { id: gameId, currency, smallBlind, bigBlind, chipRatio, status } = game;
  const { data: events = [] } = useLedger(gameId);
  const { data: players = [] } = usePlayers();
  const appendEvent = useAppendEvent(gameId);
  const [pending, setPending] = useState<PendingEntry>();

  const editable = status === "open";
  const ledger = summarizeByPlayer(events);
  const totals = ledgerTotals(ledger);
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";

  function closeDialog() {
    setPending(undefined);
    appendEvent.reset();
  }

  function handleChips(chips: number) {
    if (!pending) return;
    const { kind, playerId } = pending;
    appendEvent.mutate(
      {
        ...newEventMeta(gameId),
        type: kind === "cash_out" ? "cash_out" : nextBuyType(events, playerId),
        playerId,
        chips,
      },
      { onSuccess: closeDialog },
    );
  }

  function handleReverse(eventId: string) {
    if (!canReverse(events, eventId) || !window.confirm("撤销这笔记录？")) return;
    appendEvent.mutate({
      ...newEventMeta(gameId),
      type: "reversal",
      reversedEventId: eventId,
    });
  }

  return (
    <Page
      title={`${formatGameMoney(smallBlind, currency)} / ${formatGameMoney(bigBlind, currency)}`}
      actions={
        editable && (
          <Link
            to="/games/$gameId/settings"
            params={{ gameId }}
            className="inline-flex min-h-11 shrink-0 items-center text-highlight"
          >
            修改设置
          </Link>
        )
      }
    >
      <p className="text-sm text-muted">
        {CURRENCY_INFO[currency].label} · {chipRatio.chips.toLocaleString("zh-CN")} 筹码 ={" "}
        {formatGameMoney(chipRatio.amount, currency)}
      </p>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["总买入", totals.boughtChips],
          ["已兑出", totals.cashedOutChips],
          ["场上", totals.inPlayChips],
        ].map(([label, chips]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-2 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">
              {formatGameMoney(chipsToCents(Number(chips), chipRatio), currency)}
            </dd>
          </div>
        ))}
      </dl>

      <LedgerPlayers
        players={ledger}
        nameOf={nameOf}
        ratio={chipRatio}
        currency={currency}
        editable={editable}
        onRebuy={(playerId) => setPending({ kind: "buy", playerId, name: nameOf(playerId) })}
        onCashOut={(playerId) => setPending({ kind: "cash_out", playerId, name: nameOf(playerId) })}
      />

      {ledger.length > 0 && (
        <Link
          to="/games/$gameId/settlement"
          params={{ gameId }}
          className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-accent-text"
        >
          {editable ? "结算" : "查看结算"}
        </Link>
      )}

      {editable && (
        <AddPlayerToGame
          excludedIds={new Set(ledger.map(({ playerId }) => playerId))}
          onPick={({ id, name }: Player) => setPending({ kind: "buy", playerId: id, name })}
        />
      )}

      {appendEvent.isError && !pending && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      {events.length > 0 && (
        <LedgerLog events={events} nameOf={nameOf} editable={editable} onReverse={handleReverse} />
      )}

      {pending && (
        <ChipAmountDialog
          key={pending.playerId}
          title={`${pending.kind === "cash_out" ? "兑出" : nextBuyType(events, pending.playerId) === "buy_in" ? "买入" : "补码"} · ${pending.name}`}
          submitLabel="确定"
          initialChips={pending.kind === "buy" ? lastBuyChips(events) : undefined}
          allowZero={pending.kind === "cash_out"}
          ratio={chipRatio}
          currency={currency}
          saving={appendEvent.isPending}
          saveFailed={appendEvent.isError}
          onSubmit={handleChips}
          onClose={closeDialog}
        />
      )}
    </Page>
  );
}
