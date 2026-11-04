import {
  canReverse,
  chipsToCents,
  type Game,
  type HandChange,
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
import { HandsDialog } from "@/components/game/HandsDialog";
import { LedgerLog } from "@/components/game/LedgerLog";
import { LedgerPlayers } from "@/components/game/LedgerPlayers";
import { Page } from "@/components/Page";
import { useGame } from "@/data/games";
import { newEventMeta, useAdjustHands, useAppendEvent, useLedger } from "@/data/ledger";
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

/**
 * 正在记的这一笔。
 * `buy` 和 `cash_out` 输入筹码数，其余输入手数：
 * `join` 首次买入，`edit` 改成目标手数，`rejoin` 离桌后在原有基础上补码。
 */
type PendingEntry = {
  kind: "buy" | "cash_out" | "join" | "edit" | "rejoin";
  playerId: string;
  name: string;
};

const HANDS_TITLE = { join: "买入", edit: "调整手数", rejoin: "补码" } as const;

function GameLedger({ game }: { game: Game }) {
  const { id: gameId, currency, smallBlind, bigBlind, chipRatio, handChips, status } = game;
  const { data: events = [] } = useLedger(gameId);
  const { data: players = [] } = usePlayers();
  const appendEvent = useAppendEvent(gameId);
  const adjustHands = useAdjustHands(gameId);
  const [pending, setPending] = useState<PendingEntry>();

  const editable = status === "open";
  const ledger = summarizeByPlayer(events);
  const totals = ledgerTotals(ledger);
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";

  function boughtHands(playerId: string) {
    const bought = ledger.find((p) => p.playerId === playerId)?.boughtChips ?? 0;
    return handChips === undefined ? 0 : bought / handChips;
  }

  function closeDialog() {
    setPending(undefined);
    appendEvent.reset();
    adjustHands.reset();
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

  function handleHands(playerId: string, change: HandChange, onSuccess?: () => void) {
    if (handChips === undefined) return;
    adjustHands.mutate({ playerId, handChips, change }, { onSuccess: () => onSuccess?.() });
  }

  function handleRebuy(playerId: string) {
    const kind = handChips === undefined ? "buy" : "rejoin";
    setPending({ kind, playerId, name: nameOf(playerId) });
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
        <div className="flex shrink-0 items-center gap-3">
          {editable && (
            <Link
              to="/games/$gameId/settings"
              params={{ gameId }}
              className="inline-flex min-h-11 items-center text-highlight"
            >
              设置
            </Link>
          )}
          {ledger.length > 0 && (
            <Link
              to="/games/$gameId/settlement"
              params={{ gameId }}
              className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-accent-text"
            >
              {editable ? "结算" : "查看结算"}
            </Link>
          )}
        </div>
      }
    >
      <p className="text-sm text-muted">
        {CURRENCY_INFO[currency].label} · {chipRatio.chips.toLocaleString("zh-CN")} 筹码 ={" "}
        {formatGameMoney(chipRatio.amount, currency)}
        {handChips !== undefined && ` · 1 手 ${handChips.toLocaleString("zh-CN")}`}
      </p>

      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ["总买入", totals.boughtChips],
          ["已兑出", totals.cashedOutChips],
          ["场上", totals.inPlayChips],
        ].map(([label, chips]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-2 py-1.5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-semibold">
              {formatGameMoney(chipsToCents(Number(chips), chipRatio), currency)}
            </dd>
          </div>
        ))}
      </dl>

      {editable && (
        <AddPlayerToGame
          excludedIds={new Set(ledger.map(({ playerId }) => playerId))}
          onPick={({ id, name }: Player) =>
            setPending({ kind: handChips === undefined ? "buy" : "join", playerId: id, name })
          }
        />
      )}

      <LedgerPlayers
        players={ledger}
        nameOf={nameOf}
        handChips={handChips}
        ratio={chipRatio}
        currency={currency}
        editable={editable}
        onStepHands={(playerId, by) => handleHands(playerId, { by })}
        onEditHands={(playerId) => setPending({ kind: "edit", playerId, name: nameOf(playerId) })}
        onRebuy={handleRebuy}
        onCashOut={(playerId) => setPending({ kind: "cash_out", playerId, name: nameOf(playerId) })}
      />

      {(appendEvent.isError || adjustHands.isError) && !pending && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      {events.length > 0 && (
        <LedgerLog events={events} nameOf={nameOf} editable={editable} onReverse={handleReverse} />
      )}

      {pending &&
        pending.kind !== "buy" &&
        pending.kind !== "cash_out" &&
        handChips !== undefined && (
          <HandsDialog
            key={pending.playerId}
            title={`${HANDS_TITLE[pending.kind]} · ${pending.name}`}
            initialHands={pending.kind === "edit" ? boughtHands(pending.playerId) : 1}
            selectInput={pending.kind === "edit"}
            handChips={handChips}
            ratio={chipRatio}
            currency={currency}
            saving={adjustHands.isPending}
            saveFailed={adjustHands.isError}
            onSubmit={(hands) =>
              handleHands(
                pending.playerId,
                pending.kind === "rejoin" ? { by: hands } : { to: hands },
                closeDialog,
              )
            }
            onClose={closeDialog}
          />
        )}

      {pending && (pending.kind === "buy" || pending.kind === "cash_out") && (
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
