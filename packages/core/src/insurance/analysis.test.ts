import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { type AllInHand, analyzeAllIn, nextStreet } from "./analysis";
import { type Card, parseCard } from "./cards";
import { buildPots } from "./pots";

const cards = (codes: string): Card[] =>
  codes.split(" ").map((code) => {
    const card = parseCard(code);
    if (card === null) throw new Error(`Bad card: ${code}`);
    return card;
  });

const hand = (playerId: string, codes: string, chips: number): AllInHand => ({
  playerId,
  cards: cards(codes),
  chips,
});

describe("buildPots", () => {
  it("makes one pot when everyone put in the same", () => {
    expect(
      buildPots([
        { playerId: "a", chips: 500 },
        { playerId: "b", chips: 500 },
      ]),
    ).toEqual([{ amountChips: 1000, playerIds: ["a", "b"], stakes: { a: 500, b: 500 } }]);
  });

  it("layers side pots by contribution", () => {
    const pots = buildPots([
      { playerId: "short", chips: 100 },
      { playerId: "mid", chips: 300 },
      { playerId: "big", chips: 300 },
    ]);
    expect(pots.map((p) => [p.amountChips, p.playerIds])).toEqual([
      [300, ["short", "mid", "big"]],
      [400, ["mid", "big"]],
    ]);
    expect(pots[1]?.stakes).toEqual({ mid: 200, big: 200 });
  });

  it("leaves an uncalled excess in a pot of its own", () => {
    const pots = buildPots([
      { playerId: "a", chips: 100 },
      { playerId: "b", chips: 250 },
    ]);
    expect(pots.at(-1)).toEqual({ amountChips: 150, playerIds: ["b"], stakes: { b: 150 } });
  });

  it("keeps folded chips in the layers they reached, without making the player eligible", () => {
    const pots = buildPots([
      { playerId: "a", chips: 100 },
      { playerId: "b", chips: 300 },
      { playerId: "c", chips: 300 },
      { playerId: "gone", chips: 200, folded: true },
    ]);
    expect(pots.map((p) => p.amountChips)).toEqual([400, 500]);
    expect(pots.flatMap((p) => p.playerIds)).not.toContain("gone");
  });

  it("adds folded chips above every live player to the last pot", () => {
    const pots = buildPots([
      { playerId: "a", chips: 100 },
      { playerId: "b", chips: 100 },
      { playerId: "gone", chips: 400, folded: true },
    ]);
    expect(pots).toHaveLength(1);
    expect(pots[0]?.amountChips).toBe(600);
  });

  it("never loses a chip", () => {
    const entry = fc.record({
      chips: fc.integer({ min: 1, max: 5000 }),
      folded: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(entry, { minLength: 1, maxLength: 9 }), (rows) => {
        const entries = rows.map((row, i) => ({ ...row, playerId: `p${i}` }));
        fc.pre(entries.some((e) => !e.folded));
        const total = entries.reduce((sum, e) => sum + e.chips, 0);
        expect(buildPots(entries).reduce((sum, p) => sum + p.amountChips, 0)).toBe(total);
      }),
    );
  });
});

describe("analyzeAllIn", () => {
  it("counts a flush draw's nine outs against an overpair on the turn", () => {
    const [pot] = analyzeAllIn(
      [hand("pair", "Ac Ad", 500), hand("draw", "Kh Qh", 500)],
      [],
      cards("2h 7h 9c 3s"),
    );
    expect(pot?.leaders.map((l) => l.playerId)).toEqual(["pair"]);
    expect(pot?.leaders[0]?.outs).toHaveLength(9);
    expect(pot?.leaders[0]?.stakeChips).toBe(500);
    expect(pot?.leaders[0]?.shareChips).toBe(1000);
    expect(pot?.equity.draw).toBeCloseTo(9 / 44);
  });

  it("counts a card that two opponents hit only once, and credits both", () => {
    const [pot] = analyzeAllIn(
      [hand("set", "2c 2d", 500), hand("one", "Ad 5c", 500), hand("two", "Ah 6c", 500)],
      [],
      cards("Ks Qd Jc 2h"),
    );
    const leader = pot?.leaders[0];
    const tens = cards("Ts Th Td Tc");
    expect(leader?.playerId).toBe("set");
    expect(leader?.outs.toSorted()).toEqual(tens.toSorted());
    expect(leader?.byOpponent.map((o) => [o.playerId, o.cards.length])).toEqual([
      ["one", 4],
      ["two", 4],
    ]);
  });

  it("credits an out to the opponent who actually wins on it", () => {
    const [pot] = analyzeAllIn(
      [hand("set", "9c 9d", 500), hand("second", "Kh Qh", 500), hand("nuts", "Ah Jh", 500)],
      [],
      cards("2h 7h 9s 3d"),
    );
    // Five hearts are left that do not fill the set: the 3h and 9h give it a full house or better
    expect(pot?.leaders[0]?.outs.toSorted()).toEqual(cards("4h 5h 6h 8h Th").toSorted());
    expect(pot?.leaders[0]?.byOpponent.map((o) => o.playerId)).toEqual(["nuts"]);
  });

  it("works out each pot apart, so a short stack's outs only touch the main pot", () => {
    const pots = analyzeAllIn(
      [hand("short", "Kh Qh", 100), hand("leader", "Ac Ad", 400), hand("second", "Jc Jd", 400)],
      [],
      cards("2h 7h 9c 3s"),
    );
    expect(pots.map((p) => p.amountChips)).toEqual([300, 600]);
    const [main, side] = pots;
    const hearts = cards("Ah 3h 4h 5h 6h 8h 9h Th");
    expect(main?.leaders[0]?.outs.some((card) => hearts.includes(card))).toBe(true);
    expect(side?.playerIds).toEqual(["leader", "second"]);
    expect(side?.leaders[0]?.outs.some((card) => hearts.includes(card))).toBe(false);
    expect(side?.leaders[0]?.outs).toHaveLength(2);
  });

  it("separates cards that split the pot from cards that lose it", () => {
    const [pot] = analyzeAllIn(
      [hand("high", "Ac Kd", 500), hand("lower", "As Qd", 500)],
      [],
      cards("2h 7c 9d Th"),
    );
    const leader = pot?.leaders[0];
    expect(leader?.playerId).toBe("high");
    expect(leader?.outs).toHaveLength(3);
    expect(leader?.tieCards).toHaveLength(0);

    const [board] = analyzeAllIn(
      [hand("high", "Ac Kd", 500), hand("lower", "Ad Qd", 500)],
      [],
      cards("Kc Qh Jd 9s"),
    );
    // Any ten gives both players the same Broadway straight
    expect(board?.leaders[0]?.tieCards).toHaveLength(4);
  });

  it("lets tied leaders share the pot and each insure their share", () => {
    const [pot] = analyzeAllIn(
      [hand("a", "As Kd", 500), hand("b", "Ad Kc", 500), hand("c", "2c 2d", 500)],
      [],
      cards("Ah Kh 9c 4s"),
    );
    expect(pot?.leaders.map((l) => l.playerId)).toEqual(["a", "b"]);
    expect(pot?.leaders[0]?.shareChips).toBe(750);
  });

  it("gives equities that add up to 1 from the flop", () => {
    const [pot] = analyzeAllIn(
      [hand("a", "Ac Ad", 500), hand("b", "Kh Qh", 500), hand("c", "Jc Tc", 500)],
      [],
      cards("2h 7h 9c"),
    );
    const total = Object.values(pot?.equity ?? {}).reduce((sum, e) => sum + e, 0);
    expect(total).toBeCloseTo(1);
  });

  it("skips a pot only one player can win", () => {
    const pots = analyzeAllIn(
      [hand("a", "Ac Ad", 100), hand("b", "Kh Qh", 300)],
      [],
      cards("2h 7h 9c 3s"),
    );
    expect(pots).toHaveLength(1);
  });
});

describe("nextStreet", () => {
  it("sells the next card from the flop and turn only", () => {
    expect(nextStreet(cards("2h 7h"))).toBeNull();
    expect(nextStreet(cards("2h 7h 9c"))).toBe("turn");
    expect(nextStreet(cards("2h 7h 9c 3s"))).toBe("river");
    expect(nextStreet(cards("2h 7h 9c 3s 4d"))).toBeNull();
  });
});
