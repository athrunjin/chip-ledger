import {
  formatOdds,
  type Game,
  INSURANCE_PLAYER_ID,
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
import { useBuyInsurance, useSettleInsurance, useUndoInsurance } from "@/data/insurance";
import { useLedger } from "@/data/ledger";
import { usePlayers } from "@/data/players";
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

  const editable = status === "open";
  const names = new Map(players.map(({ id, name }) => [id, name]));
  const nameOf = (playerId: string) => names.get(playerId) ?? "未知玩家";
  const ledger = summarizeByPlayer(events);
  const seat = ledger.find((p) => p.playerId === INSURANCE_PLAYER_ID);
  const seats = ledger
    .filter((p) => p.seated && p.playerId !== INSURANCE_PLAYER_ID)
    .map((p) => ({ id: p.playerId, name: nameOf(p.playerId), stackChips: p.stackChips }));
  const records = insuranceRecords(events).toReversed();

  function handleBuy({ playerId, option, oddsHundredths, outs, street }: BoughtInsurance) {
    buyInsurance.mutate({
      playerId,
      chips: option.premiumChips,
      payoutChips: option.payoutChips,
      outs,
      oddsHundredths,
      street,
    });
  }

  function handleSettle(record: InsuranceRecord, hit: boolean) {
    if (handChips !== undefined) settleInsurance.mutate({ record, hit, handChips });
  }

  function handleUndo(record: InsuranceRecord) {
    if (window.confirm("撤销这笔保险？保费和赔付都会退回。")) undoInsurance.mutate(record);
  }

  const failed = buyInsurance.isError || settleInsurance.isError || undoInsurance.isError;

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

      {insurance && editable && (
        <InsuranceCalculator
          rule={insurance}
          seats={seats}
          saving={buyInsurance.isPending}
          onBuy={handleBuy}
        />
      )}

      {failed && (
        <p role="alert" className="mt-2 text-sm text-highlight">
          保存失败，请重试。
        </p>
      )}

      {records.length > 0 && (
        <section className="mt-4 pb-8">
          <h2 className="mb-1 font-semibold">保险记录（{records.length}）</h2>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-3">
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
        </section>
      )}
    </Page>
  );
}
