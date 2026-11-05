/**
 * All-in analysis: for every pot, who leads now, which next cards beat them, and each player's equity.
 * Outs are found by dealing every unseen card, so a card that helps two opponents counts once.
 */
import { type Card, DECK } from "./cards";
import { handScore } from "./evaluator";
import { buildPots, type Pot, type PotEntry } from "./pots";

export interface AllInHand extends PotEntry {
  readonly cards: readonly Card[];
}

/** The street whose card is on sale. Insurance only covers the next card. */
export type InsuranceStreet = "turn" | "river";

export function nextStreet(board: readonly Card[]): InsuranceStreet | null {
  if (board.length === 3) return "turn";
  return board.length === 4 ? "river" : null;
}

export interface OpponentOuts {
  readonly playerId: string;
  readonly cards: readonly Card[];
}

export interface PotLeader {
  readonly playerId: string;
  /** What this leader put into the pot. */
  readonly stakeChips: number;
  /** What this leader wins if nothing changes. Tied leaders share the pot. */
  readonly shareChips: number;
  /** Cards that lose this leader their whole share. */
  readonly outs: readonly Card[];
  /** Cards that make this leader split with more players than now. */
  readonly tieCards: readonly Card[];
  /** Who overtakes on which cards. A card can appear under several opponents. */
  readonly byOpponent: readonly OpponentOuts[];
}

export interface PotAnalysis extends Pot {
  /** Players with the best hand now. More than one means they are tied. */
  readonly leaders: readonly PotLeader[];
  /** Chance of winning this pot, with ties counted as a share, by player. */
  readonly equity: Readonly<Record<string, number>>;
}

/** Tied leaders with different chances are not really level, so neither has a lead to insure. */
export function hasUnevenTie({
  leaders,
  equity,
}: Pick<PotAnalysis, "leaders" | "equity">): boolean {
  const chances = leaders.map(({ playerId }) => equity[playerId] ?? 0);
  return Math.max(...chances) - Math.min(...chances) > 1e-9;
}

function unseenCards(hands: readonly AllInHand[], board: readonly Card[]): Card[] {
  const seen = new Set<Card>([...board, ...hands.flatMap((h) => h.cards)]);
  return DECK.filter((card) => !seen.has(card));
}

function winnersOf(
  playerIds: readonly string[],
  cardsOf: ReadonlyMap<string, readonly Card[]>,
  board: readonly Card[],
): string[] {
  let best = -1;
  let winners: string[] = [];
  for (const playerId of playerIds) {
    const score = handScore([...(cardsOf.get(playerId) ?? []), ...board]);
    if (score > best) {
      best = score;
      winners = [playerId];
    } else if (score === best) {
      winners.push(playerId);
    }
  }
  return winners;
}

function leaderOf(
  pot: Pot,
  playerId: string,
  tiedLeaders: number,
  cardsOf: ReadonlyMap<string, readonly Card[]>,
  board: readonly Card[],
  unseen: readonly Card[],
): PotLeader {
  const outs: Card[] = [];
  const tieCards: Card[] = [];
  const opponents = new Map<string, Card[]>();
  for (const card of unseen) {
    const winners = winnersOf(pot.playerIds, cardsOf, [...board, card]);
    if (!winners.includes(playerId)) {
      outs.push(card);
      for (const winner of winners) {
        opponents.set(winner, [...(opponents.get(winner) ?? []), card]);
      }
    } else if (winners.length > tiedLeaders) {
      tieCards.push(card);
    }
  }
  return {
    playerId,
    stakeChips: pot.stakes[playerId] ?? 0,
    shareChips: Math.floor(pot.amountChips / tiedLeaders),
    outs,
    tieCards,
    byOpponent: [...opponents].map(([opponent, cards]) => ({ playerId: opponent, cards })),
  };
}

/** Every way to finish the board. Boards are at most two cards short here, so this stays small. */
function runouts(unseen: readonly Card[], needed: number): Card[][] {
  if (needed === 0) return [[]];
  if (needed === 1) return unseen.map((card) => [card]);
  return unseen.flatMap((first, i) => unseen.slice(i + 1).map((second) => [first, second]));
}

function potEquity(
  pot: Pot,
  cardsOf: ReadonlyMap<string, readonly Card[]>,
  board: readonly Card[],
  unseen: readonly Card[],
): Record<string, number> {
  const shares = new Map<string, number>();
  const finishes = runouts(unseen, 5 - board.length);
  for (const finish of finishes) {
    const winners = winnersOf(pot.playerIds, cardsOf, [...board, ...finish]);
    for (const winner of winners) {
      shares.set(winner, (shares.get(winner) ?? 0) + 1 / winners.length);
    }
  }
  return Object.fromEntries(
    pot.playerIds.map((id) => [id, (shares.get(id) ?? 0) / finishes.length]),
  );
}

/**
 * Analyzes each pot with at least two players, largest contest first in main-to-side order.
 * Needs a flop or turn board: preflop has no next single card to sell.
 * Cards folded players held are unknown, so they stay in the deck and count as outs.
 */
export function analyzeAllIn(
  hands: readonly AllInHand[],
  folded: readonly PotEntry[],
  board: readonly Card[],
): PotAnalysis[] {
  const cardsOf = new Map(hands.map((h) => [h.playerId, h.cards]));
  const unseen = unseenCards(hands, board);
  const pots = buildPots([...hands, ...folded.map((entry) => ({ ...entry, folded: true }))]);
  return pots
    .filter((pot) => pot.playerIds.length > 1)
    .map((pot) => {
      const leaderIds = winnersOf(pot.playerIds, cardsOf, board);
      return {
        ...pot,
        leaders: leaderIds.map((id) => leaderOf(pot, id, leaderIds.length, cardsOf, board, unseen)),
        equity: potEquity(pot, cardsOf, board, unseen),
      };
    });
}
