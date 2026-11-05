import {
  handResult,
  type InsuranceHand,
  insuranceTopUp,
  type PlayerHandResult,
  playerHandResults,
} from "@holdem/core";
import type { ReactNode } from "react";
import { formatSignedChips } from "@/lib/chips";
import { BoardCards, CardFace, type SeatChips } from "./InsuranceHandFlow";

const chipText = (chips: number) => chips.toLocaleString("zh-CN");

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{children}</dd>
    </div>
  );
}

function PlayerResult({
  result,
  name,
  cards,
}: {
  result: PlayerHandResult;
  name: string;
  cards: readonly number[];
}) {
  const { netChips, potChips, refundChips, insuranceChips, stackChips, shortChips } = result;
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{name}</span>
          <span className={"block text-xl font-semibold tabular-nums"}>
            {formatSignedChips(netChips)}
          </span>
        </p>
        <span className="flex gap-1">
          {cards.map((card) => (
            <CardFace key={card} card={card} />
          ))}
        </span>
      </div>
      <dl className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
        <Line label="从底池拿走">{chipText(potChips)}</Line>
        {refundChips > 0 && <Line label="退回未跟注">{chipText(refundChips)}</Line>}
        <Line label="保险盈亏">{formatSignedChips(insuranceChips)}</Line>
        <Line label="后手">{stackChips === null ? "Cover 不适用" : chipText(stackChips)}</Line>
      </dl>
      {shortChips > 0 && (
        <p className="mt-1 text-sm text-highlight">还差 {chipText(shortChips)} 保费没有支付。</p>
      )}
    </li>
  );
}

/** Everything the hand comes to, for the organizer to accept before it reaches the table. */
export function HandSummary({
  hand,
  nameOf,
  seat,
  recording,
  saving,
  onBack,
  onConfirm,
}: {
  hand: InsuranceHand;
  nameOf: (id: string) => string;
  seat: SeatChips | undefined;
  recording: boolean;
  saving: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { premiumChips, payoutChips, seatChips } = handResult(hand);
  const topUp = seat
    ? insuranceTopUp(seat.stackChips + premiumChips, payoutChips, seat.handChips)
    : 0;
  const results = playerHandResults(hand);

  return (
    <section aria-label="本手总结">
      <h2 className="mt-3 mb-2 font-semibold">本手总结</h2>
      <BoardCards cards={hand.board} />
      <ul className="mt-3 flex flex-col gap-2">
        {results.map((result) => (
          <PlayerResult
            key={result.playerId}
            result={result}
            name={nameOf(result.playerId)}
            cards={hand.players.find((p) => p.playerId === result.playerId)?.cards ?? []}
          />
        ))}
      </ul>
      <section aria-label="保险" className="mt-2 rounded-xl border border-line bg-surface p-3">
        <h3 className="font-semibold">保险</h3>
        <dl className="mt-1 flex flex-col gap-1">
          <Line label="本手盈亏">{formatSignedChips(seatChips)}</Line>
          {topUp > 0 && <Line label="自动买入">{chipText(topUp)}</Line>}
          {seat && <Line label="后手">{chipText(seat.stackChips + seatChips + topUp)}</Line>}
        </dl>
      </section>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-xl border border-line font-medium"
        >
          返回上一步
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="min-h-12 rounded-xl bg-accent font-semibold text-accent-text disabled:opacity-40"
        >
          {recording ? "确认并返回牌局" : "重新计算"}
        </button>
      </div>
    </section>
  );
}
