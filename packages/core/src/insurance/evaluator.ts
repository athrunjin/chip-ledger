/**
 * Hand evaluation for 5 to 7 cards: picks the best five without trying every combination.
 * Scores compare directly, so a higher score is a better hand and equal scores split.
 */
import type { Card } from "./cards";

export const HAND_CATEGORIES = [
  "high-card",
  "pair",
  "two-pair",
  "trips",
  "straight",
  "flush",
  "full-house",
  "quads",
  "straight-flush",
] as const;

export type HandCategory = (typeof HAND_CATEGORIES)[number];

const BASE = 13;
const CATEGORY_UNIT = BASE ** 5;

/** Packs a category and up to five ranks, most significant first. */
function score(category: HandCategory, ranks: readonly number[]): number {
  let packed = HAND_CATEGORIES.indexOf(category);
  for (let i = 0; i < 5; i++) packed = packed * BASE + (ranks[i] ?? 0);
  return packed;
}

export function handCategory(handScore: number): HandCategory {
  return HAND_CATEGORIES[Math.floor(handScore / CATEGORY_UNIT)] ?? "high-card";
}

/** Rank of the straight's top card in a mask of ranks, or -1. The ace also counts below the two. */
function straightHigh(mask: number): number {
  const withLowAce = (mask << 1) | ((mask >> 12) & 1);
  for (let high = 12; high >= 3; high--) {
    if (((withLowAce >> (high - 3)) & 0b11111) === 0b11111) return high;
  }
  return -1;
}

function ranksInMask(mask: number): number[] {
  const ranks: number[] = [];
  for (let rank = 12; rank >= 0; rank--) {
    if (mask & (1 << rank)) ranks.push(rank);
  }
  return ranks;
}

export function handScore(cards: readonly Card[]): number {
  const counts = new Array<number>(13).fill(0);
  const suitMasks = [0, 0, 0, 0];
  let rankMask = 0;
  for (const card of cards) {
    const rank = Math.floor(card / 4);
    const suit = card % 4;
    counts[rank] = (counts[rank] ?? 0) + 1;
    suitMasks[suit] = (suitMasks[suit] ?? 0) | (1 << rank);
    rankMask |= 1 << rank;
  }

  const flushMask = suitMasks.find((mask) => ranksInMask(mask).length >= 5);
  if (flushMask !== undefined) {
    const high = straightHigh(flushMask);
    if (high >= 0) return score("straight-flush", [high]);
  }

  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let rank = 12; rank >= 0; rank--) {
    const count = counts[rank] ?? 0;
    if (count === 4) quads.push(rank);
    else if (count === 3) trips.push(rank);
    else if (count === 2) pairs.push(rank);
    else if (count === 1) singles.push(rank);
  }

  const [quad] = quads;
  if (quad !== undefined) {
    return score("quads", [quad, ...ranksInMask(rankMask & ~(1 << quad)).slice(0, 1)]);
  }
  const [trip, secondTrip] = trips;
  const [pair, secondPair, thirdPair] = pairs;
  const pairRank = Math.max(secondTrip ?? -1, pair ?? -1);
  if (trip !== undefined && pairRank >= 0) return score("full-house", [trip, pairRank]);
  if (flushMask !== undefined) return score("flush", ranksInMask(flushMask));
  const straight = straightHigh(rankMask);
  if (straight >= 0) return score("straight", [straight]);
  if (trip !== undefined) return score("trips", [trip, ...singles.slice(0, 2)]);
  if (pair !== undefined && secondPair !== undefined) {
    const kicker = Math.max(thirdPair ?? -1, singles[0] ?? -1);
    return score("two-pair", [pair, secondPair, kicker]);
  }
  if (pair !== undefined) return score("pair", [pair, ...singles.slice(0, 3)]);
  return score("high-card", singles);
}
