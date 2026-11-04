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
import { LeaveDialog } from "@/components/game/LeaveDialog";
import { LedgerLog } from "@/components/game/LedgerLog";
import { LedgerPlayers } from "@/components/game/LedgerPlayers";
import { Page } from "@/components/Page";
import { useGame } from "@/data/games";
import {
  newEventMeta,
  useAdjustHands,
  useAppendEvent,
  useLeaveTable,
  useLedger,
} from "@/data/ledger";
import { usePlayers } from "@/data/players";
import { formatSignedChips } from "@/lib/chips";
import { cn } from "@/lib/cn";
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
 * The record being entered.
 * `buy` and `stack` take chips, `leave` confirms both, and the others take hands:
 * `join` is a first buy-in, `edit` sets a target, and `rejoin` adds hands after leaving.
 */
type PendingEntry = {
  kind: "buy" | "stack" | "leave" | "join" | "edit" | "rejoin";
  playerId: string;
  name: string;
};

const HANDS_TITLE = { join: "买入", edit: "调整手数", rejoin: "补码" } as const;

function GameLedger({ game }: { game: Game }) {
  const {
    id: gameId,
    currency,
    smallBlindChips,
    bigBlindChips,
    chipRatio,
    handChips,
    status,
  } = game;
  const { data: events = [] } = useLedger(gameId);
  const { data: players = [] } = usePlayers();
  const appendEvent = useAppendEvent(gameId);
  const adjustHands = useAdjustHands(gameId);
  const leaveTable = useLeaveTable(gameId);
  const [pending, setPending] = useState<PendingEntry>();

  const editable = status === "open";
  const ledger = summarizeByPlayer(events);
  const totals = ledgerTotals(ledger);
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";

  function playerTotals(playerId: string) {
    const player = ledger.find((p) => p.playerId === playerId);
    return {
      boughtChips: player?.boughtChips ?? 0,
      cashedOutChips: player?.cashedOutChips ?? 0,
      stackChips: player?.stackChips ?? 0,
    };
  }

  function boughtHands(playerId: string) {
    return handChips === undefined ? 0 : playerTotals(playerId).boughtChips / handChips;
  }

  function closeDialog() {
    setPending(undefined);
    appendEvent.reset();
    adjustHands.reset();
    leaveTable.reset();
  }

  function handleChips(chips: number) {
    if (!pending) return;
    const { kind, playerId } = pending;
    appendEvent.mutate(
      {
        ...newEventMeta(gameId),
        type: kind === "stack" ? "stack_set" : nextBuyType(events, playerId),
        playerId,
        chips,
      },
      { onSuccess: closeDialog },
    );
  }

  function handleLeave(playerId: string, chips: number, hands: number | undefined) {
    leaveTable.mutate(
      {
        playerId,
        chips,
        ...(handChips !== undefined && hands !== undefined
          ? { hands: { handChips, count: hands } }
          : {}),
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
      title={`${smallBlindChips} / ${bigBlindChips}`}
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
          ["总买入", formatGameMoney(chipsToCents(totals.boughtChips, chipRatio), currency)],
          ["已离桌", formatGameMoney(chipsToCents(totals.cashedOutChips, chipRatio), currency)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-surface px-2 py-1.5">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
        <div
          className={cn(
            "rounded-xl border bg-surface px-2 py-1.5",
            totals.balanceChips === 0 ? "border-line" : "border-highlight",
          )}
        >
          <dt className="text-xs text-muted">牌桌平衡</dt>
          <dd className={cn("font-semibold", totals.balanceChips !== 0 && "text-highlight")}>
            {formatSignedChips(totals.balanceChips)}
          </dd>
        </div>
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
        onEditStack={(playerId) => setPending({ kind: "stack", playerId, name: nameOf(playerId) })}
        onRebuy={handleRebuy}
        onLeave={(playerId) => setPending({ kind: "leave", playerId, name: nameOf(playerId) })}
      />

      {(appendEvent.isError || adjustHands.isError || leaveTable.isError) && !pending && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      {events.length > 0 && (
        <LedgerLog events={events} nameOf={nameOf} editable={editable} onReverse={handleReverse} />
      )}

      {pending?.kind === "leave" && (
        <LeaveDialog
          key={pending.playerId}
          name={pending.name}
          handChips={handChips}
          {...playerTotals(pending.playerId)}
          ratio={chipRatio}
          currency={currency}
          saving={leaveTable.isPending}
          saveFailed={leaveTable.isError}
          onSubmit={(chips, hands) => handleLeave(pending.playerId, chips, hands)}
          onClose={closeDialog}
        />
      )}

      {pending &&
        (pending.kind === "join" || pending.kind === "edit" || pending.kind === "rejoin") &&
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

      {pending && (pending.kind === "buy" || pending.kind === "stack") && (
        <ChipAmountDialog
          key={pending.playerId}
          title={`${pending.kind === "stack" ? "筹码" : nextBuyType(events, pending.playerId) === "buy_in" ? "买入" : "补码"} · ${pending.name}`}
          submitLabel="确定"
          initialChips={
            pending.kind === "stack"
              ? playerTotals(pending.playerId).stackChips
              : lastBuyChips(events)
          }
          allowZero={pending.kind === "stack"}
          selectInput={pending.kind === "stack"}
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
