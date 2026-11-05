import { type Card, cardRank, cardSuit, type Suit } from "@holdem/core";

const SUIT_SYMBOL: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

export function suitSymbol(suit: Suit) {
  return SUIT_SYMBOL[suit];
}

export function isRedSuit(suit: Suit) {
  return suit === "h" || suit === "d";
}

/** A card as read at the table, e.g. A♠ or 10♥. */
export function formatCardText(card: Card) {
  const rank = cardRank(card);
  return `${rank === "T" ? "10" : rank}${suitSymbol(cardSuit(card))}`;
}
