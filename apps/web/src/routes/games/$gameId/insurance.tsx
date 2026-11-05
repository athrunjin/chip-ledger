import {
  formatOdds,
  type Game,
  handResult,
  INSURANCE_PLAYER_ID,
  type InsuranceHand,
  type InsuranceRecord,
  type InsuranceStatus,
  insuranceRecords,
  summarizeByPlayer,
} from "@holdem/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  type BoughtInsurance,
  InsuranceCalculator,
} from "@/components/insurance/InsuranceCalculator";
import { Page } from "@/components/Page";
import { useGame } from "@/data/games";
import {
  newInsuranceHand,
  useBuyInsurance,
  useDiscardInsuranceHand,
  useFinishInsuranceHand,
  useInsuranceHands,
  useSaveInsuranceHand,
  useSettleInsurance,
  useUndoInsurance,
  useUndoInsuranceHand,
} from "@/data/insurance";
import { useLedger } from "@/data/ledger";
import { usePlayers } from "@/data/players";
import { formatCardText } from "@/lib/cards";
import { formatSignedChips } from "@/lib/chips";

export const Route = createFileRoute("/games/$gameId/insurance")({
  component: InsurancePage,
});

const STATUS_TEXT: Record<InsuranceStatus, string> = {
  pending: "待开奖",
  hit: "命中",
  miss: "未中",
};

const STREET_TEXT = { turn: "转牌", river: "河牌" } as const;

const chipText = (chips: number) => chips.toLocaleString("zh-CN");

function HandRecord({
  hand,
  number,
  nameOf,
  undoing,
  onUndo,
}: {
  hand: InsuranceHand;
  number: number;
  nameOf: (playerId: string) => string;
  /** Missing once the game is closed. */
  undoing: boolean | undefined;
  onUndo: () => void;
}) {
  const { seatChips } = handResult(hand);
  return (
    <li>
      <details>
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2">
          <span className="min-w-0 truncate font-medium">
            第 {number} 手 · {hand.players.map((p) => nameOf(p.playerId)).join(" / ")}
          </span>
          <span className="shrink-0 text-sm text-highlight tabular-nums">
            {hand.purchases.length === 0 ? "未投保" : formatSignedChips(seatChips)}
          </span>
        </summary>
        <p className="text-sm text-muted">公共牌 {hand.board.map(formatCardText).join(" ")}</p>
        <ul className="pb-2">
          {hand.purchases.map((purchase) => (
            <li key={purchase.id} className="mt-1 text-sm tabular-nums">
              <span className="font-medium">
                {nameOf(purchase.playerId)} · {STREET_TEXT[purchase.street]} ·{" "}
                {purchase.hit ? "命中" : "未中"}
              </span>
              <span className="block text-muted">
                {purchase.outs.length} outs · 赔 {formatOdds(purchase.oddsHundredths)} · 保费{" "}
                {chipText(purchase.premiumChips)} · 赔付 {chipText(purchase.payoutChips)}
              </span>
            </li>
          ))}
        </ul>
        {undoing !== undefined && (
          <button
            type="button"
            disabled={undoing}
            onClick={onUndo}
            className="mb-2 min-h-11 rounded-lg px-3 text-sm text-muted disabled:opacity-60"
          >
            撤销这手
          </button>
        )}
      </details>
    </li>
  );
}

function InsurancePage() {
  const { gameId } = Route.useParams();
  const { data: game } = useGame(gameId);

  if (!game) return null;
  return <GameInsurance game={game} />;
}

function GameInsurance({ game }: { game: Game }) {
  const { id: gameId, handChips, insurance, status } = game;
  const { data: events = [] } = useLedger(gameId);
  const { data: players = [] } = usePlayers();
  const buyInsurance = useBuyInsurance(gameId);
  const settleInsurance = useSettleInsurance(gameId);
  const undoInsurance = useUndoInsurance(gameId);

  const navigate = Route.useNavigate();
  const editable = status === "open";
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";
  const ledger = summarizeByPlayer(events);
  const seat = ledger.find((p) => p.playerId === INSURANCE_PLAYER_ID);
  const seats = ledger
    .filter((p) => p.seated && p.playerId !== INSURANCE_PLAYER_ID)
    .map((p) => ({ id: p.playerId, name: nameOf(p.playerId) }));
  const records = insuranceRecords(events)
    .filter(({ purchase }) => purchase.handId === undefined)
    .toReversed();
  const { data: hands } = useInsuranceHands(gameId);
  const saveHand = useSaveInsuranceHand(gameId);
  const discardHand = useDiscardInsuranceHand(gameId);
  const finishHand = useFinishInsuranceHand(gameId);
  const undoHand = useUndoInsuranceHand(gameId);
  const finished = hands?.filter((hand) => hand.status === "done") ?? [];
  const openHand = hands?.find((hand) => hand.status === "open");
  const count = finished.length + records.length;
  const pending = records.some(({ status: result }) => result === "pending");

  async function handleBuy({ playerId, option, oddsHundredths, outs, street }: BoughtInsurance) {
    try {
      return await buyInsurance.mutateAsync({
        playerId,
        chips: option.premiumChips,
        payoutChips: option.payoutChips,
        outs,
        oddsHundredths,
        street,
      });
    } catch {
      return undefined; // The page shows the failure from the mutation
    }
  }

  function handleRevise(purchaseId: string) {
    const record = records.find(({ purchase }) => purchase.id === purchaseId);
    if (!record) return true;
    if (
      record.status !== "pending" &&
      !window.confirm("这笔保险已开奖，修改会撤销它的结果。继续？")
    ) {
      return false;
    }
    undoInsurance.mutate(record);
    return true;
  }

  function handleSettle(record: InsuranceRecord, hit: boolean) {
    if (handChips !== undefined) settleInsurance.mutate({ record, hit, handChips });
  }

  function handleUndo(record: InsuranceRecord) {
    if (window.confirm("撤销这笔保险？它的盈亏也会一起撤销。")) undoInsurance.mutate(record);
  }

  function handleUndoHand(hand: InsuranceHand) {
    if (window.confirm("撤销这手保险？它的盈亏会一起撤销。")) undoHand.mutate(hand.id);
  }

  const failed =
    buyInsurance.isError ||
    settleInsurance.isError ||
    undoInsurance.isError ||
    saveHand.isError ||
    finishHand.isError ||
    undoHand.isError;

  return (
    <Page
      title="保险"
      actions={
        <Link
          to="/games/$gameId"
          params={{ gameId }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-highlight"
        >
          <ArrowLeft className="size-5" strokeWidth={1.75} aria-hidden />
          返回牌局
        </Link>
      }
    >
      {seat && (
        <p className="mb-3 text-sm text-muted">
          保险筹码 {chipText(seat.stackChips)} · 盈亏 {formatSignedChips(seat.netChips)}
        </p>
      )}

      {!insurance && <p className="text-muted">这局没有开启保险，可以在设置里开启。</p>}

      {insurance && editable && hands && (
        <InsuranceCalculator
          rule={insurance}
          seats={seats}
          saving={buyInsurance.isPending}
          recorder={{
            onBuy: handleBuy,
            onRevise: handleRevise,
            boughtIds: new Set(records.map(({ purchase }) => purchase.id)),
          }}
          handStore={{
            save: saveHand.mutate,
            discard: discardHand.mutate,
            finish: async (hand) => {
              if (handChips === undefined) return;
              await finishHand.mutateAsync({ hand, handChips });
              navigate({ to: "/games/$gameId", params: { gameId } });
            },
          }}
          seat={
            handChips === undefined ? undefined : { stackChips: seat?.stackChips ?? 0, handChips }
          }
          openHand={openHand}
          createHand={() => newInsuranceHand(gameId)}
        />
      )}

      {failed && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      {count > 0 && (
        <details open={pending} className="mt-4 mb-8 rounded-xl border border-line bg-surface px-3">
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold">
            保险记录（{count}）
          </summary>
          <ul className="divide-y divide-line">
            {finished.toReversed().map((hand) => (
              <HandRecord
                key={hand.id}
                hand={hand}
                number={finished.indexOf(hand) + 1}
                nameOf={nameOf}
                undoing={editable ? undoHand.isPending : undefined}
                onUndo={() => handleUndoHand(hand)}
              />
            ))}
            {records.map((record) => {
              const { purchase, status: result } = record;
              return (
                <li key={purchase.id} className="py-2">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">
                      {nameOf(purchase.playerId)} · {STREET_TEXT[purchase.street]}
                    </span>
                    <span className="shrink-0 text-sm text-highlight">{STATUS_TEXT[result]}</span>
                  </p>
                  <p className="text-sm text-muted tabular-nums">
                    {purchase.outs} outs · 赔 {formatOdds(purchase.oddsHundredths)} · 保费{" "}
                    {chipText(purchase.chips)} · 赔付 {chipText(purchase.payoutChips)}
                  </p>
                  {editable && (
                    <div className="mt-1 flex gap-2">
                      {result === "pending" && (
                        <>
                          <button
                            type="button"
                            disabled={settleInsurance.isPending}
                            onClick={() => handleSettle(record, true)}
                            className="min-h-11 flex-1 rounded-lg border border-accent font-medium disabled:opacity-60"
                          >
                            命中
                          </button>
                          <button
                            type="button"
                            disabled={settleInsurance.isPending}
                            onClick={() => handleSettle(record, false)}
                            className="min-h-11 flex-1 rounded-lg border border-line font-medium disabled:opacity-60"
                          >
                            未中
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={undoInsurance.isPending}
                        onClick={() => handleUndo(record)}
                        className="min-h-11 rounded-lg px-3 text-sm text-muted disabled:opacity-60"
                      >
                        撤销
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </Page>
  );
}
