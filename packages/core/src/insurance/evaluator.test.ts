import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type Card, DECK, parseCard } from "./cards";
import { type HandCategory, handCategory, handScore } from "./evaluator";

const cards = (codes: string) =>
  codes.split(" ").map((code) => {
    const card = parseCard(code);
    if (card === null) throw new Error(`Bad card: ${code}`);
    return card;
  });

const bestOfFive = (seven: readonly Card[]) => {
  let best = -1;
  for (let skipA = 0; skipA < seven.length; skipA++) {
    for (let skipB = skipA + 1; skipB < seven.length; skipB++) {
      const five = seven.filter((_, i) => i !== skipA && i !== skipB);
      best = Math.max(best, handScore(five));
    }
  }
  return best;
};

describe("handScore", () => {
  it("matches the known frequency of every category across all five-card hands", () => {
    const counts = new Map<HandCategory, number>();
    for (let a = 0; a < 52; a++) {
      for (let b = a + 1; b < 52; b++) {
        for (let c = b + 1; c < 52; c++) {
          for (let d = c + 1; d < 52; d++) {
            for (let e = d + 1; e < 52; e++) {
              const category = handCategory(handScore([a, b, c, d, e]));
              counts.set(category, (counts.get(category) ?? 0) + 1);
            }
          }
        }
      }
    }
    expect(Object.fromEntries(counts)).toEqual({
      "high-card": 1_302_540,
      pair: 1_098_240,
      "two-pair": 123_552,
      trips: 54_912,
      straight: 10_200,
      flush: 5_108,
      "full-house": 3_744,
      quads: 624,
      "straight-flush": 40,
    });
  }, 30_000);

  it("picks the same hand from seven cards as trying every five", () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([...DECK], { minLength: 7, maxLength: 7 }), (seven) => {
        expect(handScore(seven)).toBe(bestOfFive(seven));
      }),
      { numRuns: 5000 },
    );
  });

  it.each([
    ["Ah 2h 3h 4h 5h 9c 9d", "straight-flush"],
    ["Ac 2d 3h 4s 5c Kd Kh", "straight"],
    ["9s 9h 9d 8s 8h 8d 2c", "full-house"],
    ["Ks Qs 9s 5s 2s Kh Kd", "flush"],
    ["7s 7h 7d 7c As Ah Ad", "quads"],
    ["As Ah Ks Kh Qs Qh 2c", "two-pair"],
  ])("reads %s as %s", (hand, category) => {
    expect(handCategory(handScore(cards(hand)))).toBe(category);
  });

  it("ranks by kicker, with a third pair able to play as the kicker", () => {
    expect(handScore(cards("As Ah Kd 7c 2s"))).toBeGreaterThan(handScore(cards("Ad Ac Qd 7h 2h")));
    expect(handScore(cards("Ks Kh Qs Qh Js Jh 2c"))).toBe(handScore(cards("Kd Kc Qd Qc Jd 3c 2d")));
  });

  it("makes a six-high straight beat the wheel", () => {
    expect(handScore(cards("2c 3d 4h 5s 6c"))).toBeGreaterThan(handScore(cards("Ac 2d 3h 4s 5c")));
  });
});
