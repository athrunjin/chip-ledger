import {
  type AllInHand,
  analyzeAllIn,
  type Card,
  formatCard,
  type InsuranceRule,
  type InsuranceStreet,
  nextStreet,
  type PotAnalysis,
  type PotTotals,
  parseChips,
  potTotals,
  type QuoteInput,
  soldOuts,
} from "@holdem/core";
import { ChevronDown, Plus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { TextField } from "@/components/TextField";
import { formatCardText } from "@/lib/cards";
import { cn } from "@/lib/cn";
import { CardPicker } from "./CardPicker";
import { DeadMoneyDialog } from "./DeadMoneyDialog";
import { type QuoteDecision, QuotePanel, type QuotePurchase } from "./QuotePanel";
import { SeatPicker } from "./SeatPicker";

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

export interface InsuranceRecorder {
  /** Resolves to the purchase's ID, or undefined if it was not saved. */
  onBuy: (purchase: BoughtInsurance) => Promise<string | undefined>;
  /** Takes a purchase back for changing. False if the organizer kept it. */
  onRevise: (purchaseId: string) => boolean;
  /** Purchases still in effect. */
  boughtIds: ReadonlySet<string>;
}

interface InsuranceCalculatorProps {
  rule: InsuranceRule;
  seats: readonly InsuranceSeat[];
  saving?: boolean;
  /** Missing for the standalone calculator, which records nothing. */
  recorder?: InsuranceRecorder;
}

/** What has been decided for each quote on this page, by a key for that exact offer. */
interface Decisions {
  get: (key: string) => QuoteDecision | undefined;
  buy: (key: string, purchase: BoughtInsurance) => Promise<void>;
  decline: (key: string) => void;
  revise: (key: string) => void;
}

type CalculatorViewProps = Omit<InsuranceCalculatorProps, "recorder"> & {
  decisions: Decisions | undefined;
};

interface Row {
  readonly key: string;
  readonly seatId: string | null;
  readonly chips: string;
  readonly cards: readonly (Card | null)[];
}

/** Where the card picker is filling. */
type Slot = { readonly row: string; readonly index: number } | { readonly board: number };

const chipText = (chips: number) => chips.toLocaleString("zh-CN");
const percentText = (share: number) => `${(share * 100).toFixed(1)}%`;
const digitsOnly = (text: string) => text.replace(/\D/g, "");

const blankRow = (key: string): Row => ({ key, seatId: null, chips: "", cards: [null, null] });

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

function LeaderQuote({
  id,
  decisionKey,
  input,
  playerId,
  saving,
  decisions,
}: {
  id: string;
  decisionKey: string;
  input: QuoteInput;
  playerId: string;
  saving: boolean | undefined;
  decisions: Decisions | undefined;
}) {
  return (
    <QuotePanel
      id={id}
      input={input}
      saving={saving}
      decision={decisions?.get(decisionKey)}
      onBuy={
        decisions &&
        ((purchase) =>
          decisions.buy(decisionKey, {
            ...purchase,
            playerId,
            outs: input.outs,
            street: input.street,
          }))
      }
      onDecline={decisions && (() => decisions.decline(decisionKey))}
      onRevise={decisions && (() => decisions.revise(decisionKey))}
    />
  );
}

function PotCard({
  pot,
  index,
  rule,
  street,
  nameOf,
  saving,
  boardKey,
  decisions,
}: {
  pot: PotAnalysis;
  index: number;
  rule: InsuranceRule;
  street: InsuranceStreet;
  nameOf: (id: string) => string;
  saving: boolean | undefined;
  boardKey: string;
  decisions: Decisions | undefined;
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
          <LeaderQuote
            id={`${index}-${leader.playerId}`}
            decisionKey={[boardKey, pot.playerIds, pot.amountChips, leader.playerId].join("|")}
            input={{
              rule,
              street,
              potChips: pot.amountChips,
              potPlayers: pot.playerIds.length,
              shareChips: leader.shareChips,
              stakeChips: leader.stakeChips,
              outs: soldOuts(rule, leader),
            }}
            playerId={leader.playerId}
            saving={saving}
            decisions={decisions}
          />
        </div>
      ))}
    </section>
  );
}

function PotSummary({ totals, onEditDead }: { totals: PotTotals; onEditDead: () => void }) {
  return (
    <section aria-label="底池合计" className="mt-3 rounded-xl border border-line bg-surface p-3">
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-sm text-muted">有效总底池</dt>
          <dd className="text-xl font-semibold tabular-nums">{chipText(totals.effectiveChips)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">死钱（已含在内）</dt>
          <dd className="flex items-center justify-between gap-2">
            <span className="text-xl font-semibold tabular-nums">{chipText(totals.deadChips)}</span>
            <button
              type="button"
              aria-label="编辑死钱"
              onClick={onEditDead}
              className="grid size-11 shrink-0 place-items-center rounded-lg border border-line text-highlight"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </dd>
        </div>
      </dl>
      {totals.uncalledChips > 0 && (
        <p className="mt-1 text-sm text-muted">
          未被跟注的 {chipText(totals.uncalledChips)} 退回，不计入。
        </p>
      )}
    </section>
  );
}

function ByCards({ rule, seats, saving, decisions }: CalculatorViewProps) {
  const [rows, setRows] = useState<readonly Row[]>([blankRow("row-0"), blankRow("row-1")]);
  const rowsAdded = useRef(rows.length);
  const [pools, setPools] = useState<readonly string[]>([]);
  const [editingDead, setEditingDead] = useState(false);
  const [board, setBoard] = useState<readonly (Card | null)[]>([null, null, null, null, null]);
  const [slot, setSlot] = useState<Slot>();
  const [seatRow, setSeatRow] = useState<string>();

  const nameOf = (id: string) => seats.find((s) => s.id === id)?.name ?? "未知玩家";
  const rowName = (row: Row) =>
    row.seatId === null ? `全下 ${rows.indexOf(row) + 1}` : nameOf(row.seatId);
  const usedCards = new Set([...rows.flatMap((r) => r.cards), ...board].filter((c) => c !== null));
  const boardCards = board.filter((card) => card !== null);
  const street = nextStreet(boardCards);

  const hands = rows.flatMap((row): AllInHand[] => {
    const chips = parseChips(row.chips);
    const cards = row.cards.filter((card) => card !== null);
    return row.seatId && chips && cards.length === 2
      ? [{ playerId: row.seatId, cards, chips }]
      : [];
  });
  const complete = hands.length === rows.length;
  const poolEntries = pools.flatMap((text, i) => {
    const chips = parseChips(text);
    return chips ? [{ playerId: `pool-${i}`, chips }] : [];
  });
  const handKey = JSON.stringify([hands, poolEntries, boardCards]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: handKey is the value of these inputs
  const pots = useMemo(
    () => (complete && street ? analyzeAllIn(hands, poolEntries, boardCards) : []),
    [handKey, complete, street],
  );

  const stakeEntries = rows.flatMap(({ key, chips: text }) => {
    const chips = parseChips(text);
    return chips ? [{ playerId: key, chips }] : [];
  });
  const totals = potTotals([
    ...stakeEntries,
    ...poolEntries.map((entry) => ({ ...entry, folded: true })),
  ]);

  function addRow() {
    setRows([...rows, blankRow(`row-${rowsAdded.current}`)]);
    rowsAdded.current += 1;
  }

  function chooseSeat(seat: InsuranceSeat) {
    setRows(
      rows.map((r) =>
        r.key === seatRow
          ? { ...r, seatId: seat.id, chips: seat.stackChips?.toString() ?? r.chips }
          : r,
      ),
    );
    setSeatRow(undefined);
  }

  function setRowChips(key: string, chips: string) {
    setRows(rows.map((r) => (r.key === key ? { ...r, chips: digitsOnly(chips) } : r)));
  }

  /** Carries on from a hand to the players after it, then the flop, then anyone skipped. */
  function nextEmpty(from: Slot, nextRows: readonly Row[], nextBoard: readonly (Card | null)[]) {
    const emptyIn = (list: readonly Row[]) => {
      const row = list.find((r) => r.cards.includes(null));
      return row && { row: row.key, index: row.cards.indexOf(null) };
    };
    const open = nextBoard.indexOf(null);
    const flop = open >= 0 && open < 3 ? { board: open } : undefined;
    if ("board" in from) return flop ?? emptyIn(nextRows);
    const at = nextRows.findIndex((r) => r.key === from.row);
    return emptyIn(nextRows.slice(at)) ?? flop ?? emptyIn(nextRows.slice(0, at));
  }

  function placeCard(card: Card | null) {
    if (!slot) return;
    const nextRows =
      "row" in slot
        ? rows.map((r) =>
            r.key === slot.row
              ? { ...r, cards: r.cards.map((c, i) => (i === slot.index ? card : c)) }
              : r,
          )
        : rows;
    const nextBoard = "board" in slot ? board.map((c, i) => (i === slot.board ? card : c)) : board;
    setRows(nextRows);
    setBoard(nextBoard);
    setSlot(card === null ? undefined : nextEmpty(slot, nextRows, nextBoard));
  }

  function slotCard(target: Slot) {
    if ("board" in target) return board[target.board] ?? null;
    return rows.find((r) => r.key === target.row)?.cards[target.index] ?? null;
  }

  function slotTitle(target: Slot) {
    if ("board" in target) return `公共牌第 ${target.board + 1} 张`;
    const row = rows.find((r) => r.key === target.row);
    return `${row ? rowName(row) : "未知玩家"} 第 ${target.index + 1} 张手牌`;
  }

  /** A filled card opens to be changed; an empty place fills from the first gap. */
  const pickFor = (cards: readonly (Card | null)[], index: number) =>
    cards[index] === null ? cards.indexOf(null) : index;

  /** Where a tab lands: the first gap, or the first card when nothing is left to fill. */
  const firstGap = (cards: readonly (Card | null)[]) => Math.max(cards.indexOf(null), 0);

  const tabs = [
    ...rows.map((row) => ({
      id: row.key,
      label: rowName(row),
      active: slot !== undefined && "row" in slot && slot.row === row.key,
      onSelect: () => setSlot({ row: row.key, index: firstGap(row.cards) }),
    })),
    {
      id: "board",
      label: "公共牌",
      active: slot !== undefined && "board" in slot,
      onSelect: () => setSlot({ board: firstGap(board) }),
    },
  ];

  const takenSeats = rows.flatMap((r) => (r.seatId && r.key !== seatRow ? [r.seatId] : []));

  return (
    <>
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">全下的玩家</span>
          <button
            type="button"
            disabled={rows.length >= seats.length}
            onClick={addRow}
            className="inline-flex min-h-11 items-center gap-1 text-highlight disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            添加
          </button>
        </div>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.key} className="rounded-xl border border-line bg-surface p-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSeatRow(row.key)}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3",
                    row.seatId === null
                      ? "border-dashed border-line text-muted"
                      : "border-line bg-bg font-medium",
                  )}
                >
                  <span className="truncate">
                    {row.seatId === null ? "选择玩家" : nameOf(row.seatId)}
                  </span>
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                </button>
                {rows.length > 2 && (
                  <button
                    type="button"
                    aria-label={`删除${rowName(row)}`}
                    onClick={() => setRows(rows.filter((r) => r !== row))}
                    className="grid size-11 shrink-0 place-items-center rounded-lg border border-line"
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    id={`stake-${row.key}`}
                    label={`${rowName(row)} 投入`}
                    value={row.chips}
                    issue={undefined}
                    inputMode="numeric"
                    onChange={(chips) => setRowChips(row.key, chips)}
                  />
                </div>
                {row.cards.map((card, index) => (
                  <CardSlot
                    // biome-ignore lint/suspicious/noArrayIndexKey: a hand has two fixed places
                    key={index}
                    card={card}
                    label={`${rowName(row)} 第 ${index + 1} 张手牌`}
                    onClick={() => setSlot({ row: row.key, index: pickFor(row.cards, index) })}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <PotSummary totals={totals} onEditDead={() => setEditingDead(true)} />

      <div className="mt-2">
        <span className="mb-1 block text-sm text-muted">公共牌</span>
        <div className="flex flex-wrap gap-2">
          {board.map((card, i) => (
            <CardSlot
              // biome-ignore lint/suspicious/noArrayIndexKey: the board has five fixed places
              key={i}
              card={card}
              label={`公共牌第 ${i + 1} 张`}
              onClick={() => setSlot({ board: pickFor(board, i) })}
            />
          ))}
        </div>
      </div>

      {!complete && <p className="mt-3 text-sm text-muted">选好玩家，填好投入和手牌后开始计算。</p>}
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
            boardKey={boardCards.join()}
            decisions={decisions}
          />
        ))}

      {editingDead && (
        <DeadMoneyDialog
          pools={pools}
          onConfirm={(next) => {
            setPools(next);
            setEditingDead(false);
          }}
          onCancel={() => setEditingDead(false)}
        />
      )}

      {slot && (
        <CardPicker
          title={slotTitle(slot)}
          tabs={tabs}
          usedCards={usedCards}
          canClear={slotCard(slot) !== null}
          onPick={placeCard}
          onClear={() => placeCard(null)}
          onClose={() => setSlot(undefined)}
        />
      )}

      {seatRow && (
        <SeatPicker
          seats={seats}
          takenSeats={takenSeats}
          onPick={chooseSeat}
          onClose={() => setSeatRow(undefined)}
        />
      )}
    </>
  );
}

function ByOuts({ rule, seats, saving, decisions }: CalculatorViewProps) {
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
      {decisions && (
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
          onChange={(value) => setPot(digitsOnly(value))}
        />
        <TextField
          id="manual-stake"
          label="自己投入"
          value={stake}
          issue={undefined}
          inputMode="numeric"
          onChange={(value) => setStake(digitsOnly(value))}
        />
        <TextField
          id="manual-outs"
          label="outs"
          value={outs}
          issue={undefined}
          inputMode="numeric"
          onChange={(value) => setOuts(digitsOnly(value))}
        />
      </div>
      {ready ? (
        <section className="rounded-xl border border-line bg-surface p-3">
          <LeaderQuote
            id="manual"
            decisionKey={["manual", buyer, street, potChips, stakeChips, outCount].join("|")}
            input={{
              rule,
              street,
              potChips,
              potPlayers: 2,
              shareChips: potChips,
              stakeChips,
              outs: outCount,
            }}
            playerId={buyer}
            saving={saving}
            decisions={decisions}
          />
        </section>
      ) : (
        <p className="text-sm text-muted">填好底池、投入和 outs 后开始计算。</p>
      )}
    </div>
  );
}

function useDecisions(recorder: InsuranceRecorder | undefined): Decisions | undefined {
  const [decided, setDecided] = useState<ReadonlyMap<string, QuoteDecision>>(new Map());
  if (!recorder) return undefined;

  const write = (key: string, decision: QuoteDecision | undefined) =>
    setDecided((current) => {
      const next = new Map(current);
      if (decision) next.set(key, decision);
      else next.delete(key);
      return next;
    });

  return {
    get(key) {
      const decision = decided.get(key);
      // A purchase undone from the records below is open again
      return decision?.kind === "bought" && !recorder.boughtIds.has(decision.purchaseId)
        ? undefined
        : decision;
    },
    async buy(key, purchase) {
      const { premiumChips, payoutChips } = purchase.option;
      const purchaseId = await recorder.onBuy(purchase);
      if (purchaseId) write(key, { kind: "bought", purchaseId, premiumChips, payoutChips });
    },
    decline: (key) => write(key, { kind: "declined" }),
    revise(key) {
      const decision = decided.get(key);
      if (decision?.kind === "bought" && !recorder.onRevise(decision.purchaseId)) return;
      write(key, undefined);
    },
  };
}

/** Works out insurance from the cards, or from an outs count for a quick price. */
export function InsuranceCalculator({ recorder, ...props }: InsuranceCalculatorProps) {
  const [mode, setMode] = useState<"cards" | "outs">("cards");
  const decisions = useDecisions(recorder);
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
      {mode === "cards" ? (
        <ByCards {...props} decisions={decisions} />
      ) : (
        <ByOuts {...props} decisions={decisions} />
      )}
    </>
  );
}
