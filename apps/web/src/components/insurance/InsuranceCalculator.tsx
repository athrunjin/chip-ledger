import {
  type AllInHand,
  analyzeAllIn,
  type Card,
  formatCard,
  type InsuranceRule,
  type InsuranceStreet,
  nextStreet,
  type PotAnalysis,
  parseChips,
  soldOuts,
} from "@holdem/core";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TextField } from "@/components/TextField";
import { formatCardText } from "@/lib/cards";
import { cn } from "@/lib/cn";
import { CardPicker } from "./CardPicker";
import { QuotePanel, type QuotePurchase } from "./QuotePanel";

export interface InsuranceSeat {
  readonly id: string;
  readonly name: string;
  /** Prefills what they put in: an all-in is usually their whole stack. */
  readonly stackChips?: number;
}

export interface BoughtInsurance extends QuotePurchase {
  readonly playerId: string;
  readonly outs: number;
  readonly street: InsuranceStreet;
}

interface InsuranceCalculatorProps {
  rule: InsuranceRule;
  seats: readonly InsuranceSeat[];
  saving?: boolean;
  /** Missing for the standalone calculator, which records nothing. */
  onBuy?: ((purchase: BoughtInsurance) => void) | undefined;
}

interface Row {
  readonly seatId: string;
  readonly chips: string;
  readonly cards: readonly (Card | null)[];
}

/** Where the card picker is filling. */
type Slot = { readonly row: string; readonly index: number } | { readonly board: number };

const chipText = (chips: number) => chips.toLocaleString("zh-CN");
const percentText = (share: number) => `${(share * 100).toFixed(1)}%`;

const toggleClass = (active: boolean) =>
  cn(
    "min-h-11 rounded-xl border px-3 font-medium",
    active ? "border-accent bg-accent text-accent-text" : "border-line bg-surface",
  );

function CardSlot({
  card,
  label,
  onClick,
}: {
  card: Card | null;
  label: string;
  onClick: () => void;
}) {
  const red = card !== null && /[hd]/.test(formatCard(card)[1] ?? "");
  return (
    <button
      type="button"
      aria-label={card === null ? `选${label}` : `${label}：${formatCardText(card)}`}
      onClick={onClick}
      className={cn(
        "grid min-h-11 min-w-11 place-items-center rounded-lg border font-semibold tabular-nums",
        card === null ? "border-dashed border-line text-muted" : "border-line bg-bg",
        red && "text-loss",
      )}
    >
      {card === null ? "?" : formatCardText(card)}
    </button>
  );
}

function PotCard({
  pot,
  index,
  rule,
  street,
  nameOf,
  saving,
  onBuy,
}: {
  pot: PotAnalysis;
  index: number;
  rule: InsuranceRule;
  street: InsuranceStreet;
  nameOf: (id: string) => string;
  saving: boolean | undefined;
  onBuy: InsuranceCalculatorProps["onBuy"];
}) {
  const title = index === 0 ? "主池" : `边池 ${index}`;
  return (
    <section className="mt-3 rounded-xl border border-line bg-surface p-3">
      <h3 className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="font-semibold tabular-nums">{chipText(pot.amountChips)}</span>
      </h3>
      <p className="text-sm text-muted">
        {pot.playerIds.map((id) => `${nameOf(id)} ${percentText(pot.equity[id] ?? 0)}`).join(" · ")}
      </p>
      {pot.leaders.map((leader) => (
        <div key={leader.playerId} className="mt-2 border-t border-line pt-2">
          <p className="font-medium">
            {nameOf(leader.playerId)} 领先
            {pot.leaders.length > 1 && "（并列）"}
            <span className="ml-1 text-sm font-normal text-muted">
              投入 {chipText(leader.stakeChips)} · 可得 {chipText(leader.shareChips)}
            </span>
          </p>
          <p className="text-sm">
            反超牌 <span className="font-semibold">{soldOuts(rule, leader)}</span> 张
            {leader.tieCards.length > 0 &&
              `，平分牌 ${leader.tieCards.length} 张${rule.tieOuts === "include" ? "（已计入）" : "（不计入）"}`}
          </p>
          <ul className="text-sm text-muted">
            {leader.byOpponent.map(({ playerId, cards }) => (
              <li key={playerId}>
                {nameOf(playerId)} {cards.length} 张：{cards.map(formatCardText).join(" ")}
              </li>
            ))}
            {leader.tieCards.length > 0 && (
              <li>平分：{leader.tieCards.map(formatCardText).join(" ")}</li>
            )}
          </ul>
          <QuotePanel
            id={`${index}-${leader.playerId}`}
            input={{
              rule,
              street,
              potChips: pot.amountChips,
              potPlayers: pot.playerIds.length,
              shareChips: leader.shareChips,
              stakeChips: leader.stakeChips,
              outs: soldOuts(rule, leader),
            }}
            saving={saving}
            onBuy={
              onBuy &&
              ((purchase) =>
                onBuy({
                  ...purchase,
                  playerId: leader.playerId,
                  outs: soldOuts(rule, leader),
                  street,
                }))
            }
          />
        </div>
      ))}
    </section>
  );
}

function ByCards({ rule, seats, saving, onBuy }: InsuranceCalculatorProps) {
  const [rows, setRows] = useState<readonly Row[]>([]);
  const [folded, setFolded] = useState<readonly string[]>([]);
  const [board, setBoard] = useState<readonly (Card | null)[]>([null, null, null, null, null]);
  const [slot, setSlot] = useState<Slot>();

  const nameOf = (id: string) => seats.find((s) => s.id === id)?.name ?? "未知玩家";
  const usedCards = new Set([...rows.flatMap((r) => r.cards), ...board].filter((c) => c !== null));
  const boardCards = board.filter((card) => card !== null);
  const street = nextStreet(boardCards);

  const hands = rows.flatMap((row): AllInHand[] => {
    const chips = parseChips(row.chips);
    const cards = row.cards.filter((card) => card !== null);
    return chips && cards.length === 2 ? [{ playerId: row.seatId, cards, chips }] : [];
  });
  const complete = rows.length >= 2 && hands.length === rows.length;
  const foldedEntries = folded.flatMap((text, i) => {
    const chips = parseChips(text);
    return chips ? [{ playerId: `folded-${i}`, chips }] : [];
  });
  const handKey = JSON.stringify([hands, foldedEntries, boardCards]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: handKey is the value of these inputs
  const pots = useMemo(
    () => (complete && street ? analyzeAllIn(hands, foldedEntries, boardCards) : []),
    [handKey, complete, street],
  );

  function toggleSeat(seat: InsuranceSeat) {
    setRows((current) =>
      current.some((r) => r.seatId === seat.id)
        ? current.filter((r) => r.seatId !== seat.id)
        : [
            ...current,
            { seatId: seat.id, chips: seat.stackChips?.toString() ?? "", cards: [null, null] },
          ],
    );
  }

  function setRowChips(seatId: string, chips: string) {
    setRows(rows.map((r) => (r.seatId === seatId ? { ...r, chips } : r)));
  }

  /** The first empty place after this one, so a whole hand can be entered in one go. */
  function nextEmpty(nextRows: readonly Row[], nextBoard: readonly (Card | null)[]) {
    for (const row of nextRows) {
      const index = row.cards.indexOf(null);
      if (index >= 0) return { row: row.seatId, index };
    }
    const open = nextBoard.indexOf(null);
    return open >= 0 && open < 3 ? { board: open } : undefined;
  }

  function placeCard(card: Card | null) {
    if (!slot) return;
    const nextRows =
      "row" in slot
        ? rows.map((r) =>
            r.seatId === slot.row
              ? { ...r, cards: r.cards.map((c, i) => (i === slot.index ? card : c)) }
              : r,
          )
        : rows;
    const nextBoard = "board" in slot ? board.map((c, i) => (i === slot.board ? card : c)) : board;
    setRows(nextRows);
    setBoard(nextBoard);
    setSlot(card === null ? undefined : nextEmpty(nextRows, nextBoard));
  }

  function slotCard(target: Slot) {
    if ("board" in target) return board[target.board] ?? null;
    return rows.find((r) => r.seatId === target.row)?.cards[target.index] ?? null;
  }

  function slotTitle(target: Slot) {
    if ("board" in target) return `公共牌第 ${target.board + 1} 张`;
    return `${nameOf(target.row)} 第 ${target.index + 1} 张手牌`;
  }

  /** Later streets need the earlier ones first. */
  const nextBoardSlot = board.indexOf(null);

  return (
    <>
      <fieldset className="mt-3">
        <legend className="mb-1 text-sm text-muted">全下的玩家</legend>
        <div className="flex flex-wrap gap-2">
          {seats.map((seat) => (
            <button
              key={seat.id}
              type="button"
              aria-pressed={rows.some((r) => r.seatId === seat.id)}
              onClick={() => toggleSeat(seat)}
              className={toggleClass(rows.some((r) => r.seatId === seat.id))}
            >
              {seat.name}
            </button>
          ))}
        </div>
      </fieldset>

      {rows.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.seatId} className="rounded-xl border border-line bg-surface p-2">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    id={`stake-${row.seatId}`}
                    label={`${nameOf(row.seatId)} 投入`}
                    value={row.chips}
                    issue={undefined}
                    inputMode="numeric"
                    onChange={(chips) => setRowChips(row.seatId, chips)}
                  />
                </div>
                {row.cards.map((card, index) => (
                  <CardSlot
                    // biome-ignore lint/suspicious/noArrayIndexKey: a hand has two fixed places
                    key={index}
                    card={card}
                    label={`${nameOf(row.seatId)} 第 ${index + 1} 张手牌`}
                    onClick={() => setSlot({ row: row.seatId, index })}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">已弃牌玩家的投入</span>
          <button
            type="button"
            onClick={() => setFolded([...folded, ""])}
            className="inline-flex min-h-11 items-center gap-1 text-highlight"
          >
            <Plus className="size-4" aria-hidden />
            添加
          </button>
        </div>
        {folded.map((text, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity of their own
          <div key={i} className="mt-1 flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                id={`folded-${i}`}
                label={`弃牌玩家 ${i + 1}`}
                value={text}
                issue={undefined}
                inputMode="numeric"
                onChange={(value) => setFolded(folded.map((f, j) => (j === i ? value : f)))}
              />
            </div>
            <button
              type="button"
              aria-label={`删除弃牌玩家 ${i + 1}`}
              onClick={() => setFolded(folded.filter((_, j) => j !== i))}
              className="grid size-12 place-items-center rounded-xl border border-line"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2">
        <span className="mb-1 block text-sm text-muted">公共牌</span>
        <div className="flex flex-wrap gap-2">
          {board.map((card, i) => (
            <CardSlot
              // biome-ignore lint/suspicious/noArrayIndexKey: the board has five fixed places
              key={i}
              card={card}
              label={`公共牌第 ${i + 1} 张`}
              onClick={() =>
                setSlot({ board: nextBoardSlot >= 0 && i > nextBoardSlot ? nextBoardSlot : i })
              }
            />
          ))}
        </div>
      </div>

      {!complete && (
        <p className="mt-3 text-sm text-muted">选至少两位玩家，填好投入和手牌后开始计算。</p>
      )}
      {complete && !street && (
        <p className="mt-3 text-sm text-muted">
          {boardCards.length < 3 ? "翻牌前不卖保险，请先选好三张翻牌。" : "五张公共牌已发完。"}
        </p>
      )}
      {complete &&
        street &&
        pots.map((pot, index) => (
          <PotCard
            key={pot.playerIds.join()}
            pot={pot}
            index={index}
            rule={rule}
            street={street}
            nameOf={nameOf}
            saving={saving}
            onBuy={onBuy}
          />
        ))}

      {slot && (
        <CardPicker
          key={JSON.stringify(slot)}
          title={slotTitle(slot)}
          usedCards={usedCards}
          canClear={slotCard(slot) !== null}
          onPick={placeCard}
          onClear={() => placeCard(null)}
          onClose={() => setSlot(undefined)}
        />
      )}
    </>
  );
}

function ByOuts({ rule, seats, saving, onBuy }: InsuranceCalculatorProps) {
  const [pot, setPot] = useState("");
  const [stake, setStake] = useState("");
  const [outs, setOuts] = useState("");
  const [street, setStreet] = useState<InsuranceStreet>("river");
  const [buyer, setBuyer] = useState(seats[0]?.id ?? "");

  const potChips = parseChips(pot);
  const stakeChips = parseChips(stake);
  const outCount = parseChips(outs);
  const ready = potChips && stakeChips && outCount !== null;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {onBuy && (
        <label className="block">
          <span className="mb-1 block text-sm text-muted">投保玩家</span>
          <select
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-line bg-surface px-3"
          >
            {seats.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={street === "turn"}
          onClick={() => setStreet("turn")}
          className={toggleClass(street === "turn")}
        >
          保转牌
        </button>
        <button
          type="button"
          aria-pressed={street === "river"}
          onClick={() => setStreet("river")}
          className={toggleClass(street === "river")}
        >
          保河牌
        </button>
      </div>
      <div className="grid grid-cols-3 items-start gap-2">
        <TextField
          id="manual-pot"
          label="底池"
          value={pot}
          issue={undefined}
          inputMode="numeric"
          onChange={setPot}
        />
        <TextField
          id="manual-stake"
          label="自己投入"
          value={stake}
          issue={undefined}
          inputMode="numeric"
          onChange={setStake}
        />
        <TextField
          id="manual-outs"
          label="outs"
          value={outs}
          issue={undefined}
          inputMode="numeric"
          onChange={setOuts}
        />
      </div>
      {ready ? (
        <section className="rounded-xl border border-line bg-surface p-3">
          <QuotePanel
            id="manual"
            input={{
              rule,
              street,
              potChips,
              potPlayers: 2,
              shareChips: potChips,
              stakeChips,
              outs: outCount,
            }}
            saving={saving}
            onBuy={
              onBuy &&
              ((purchase) => onBuy({ ...purchase, playerId: buyer, outs: outCount, street }))
            }
          />
        </section>
      ) : (
        <p className="text-sm text-muted">填好底池、投入和 outs 后开始计算。</p>
      )}
    </div>
  );
}

/** Works out insurance from the cards, or from an outs count for a quick price. */
export function InsuranceCalculator(props: InsuranceCalculatorProps) {
  const [mode, setMode] = useState<"cards" | "outs">("cards");
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={mode === "cards"}
          onClick={() => setMode("cards")}
          className={toggleClass(mode === "cards")}
        >
          选牌计算
        </button>
        <button
          type="button"
          aria-pressed={mode === "outs"}
          onClick={() => setMode("outs")}
          className={toggleClass(mode === "outs")}
        >
          填 outs
        </button>
      </div>
      {mode === "cards" ? <ByCards {...props} /> : <ByOuts {...props} />}
    </>
  );
}
