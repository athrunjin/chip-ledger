/** Playing cards as integers 0–51: `rank * 4 + suit`, with rank 0 for a two and 12 for an ace. */
export type Card = number;

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export const DECK: readonly Card[] = Array.from({ length: 52 }, (_, card) => card);

export function makeCard(rank: Rank, suit: Suit): Card {
  return RANKS.indexOf(rank) * 4 + SUITS.indexOf(suit);
}

export function cardRank(card: Card): Rank {
  return RANKS[Math.floor(card / 4)] ?? "2";
}

export function cardSuit(card: Card): Suit {
  return SUITS[card % 4] ?? "s";
}

/** Parses a code like "Ah" or "Ts". Returns null if it is not a card. */
export function parseCard(code: string): Card | null {
  const rank = RANKS.find((r) => r === code[0]);
  const suit = SUITS.find((s) => s === code[1]);
  return rank && suit && code.length === 2 ? makeCard(rank, suit) : null;
}

export function formatCard(card: Card): string {
  return `${cardRank(card)}${cardSuit(card)}`;
}
