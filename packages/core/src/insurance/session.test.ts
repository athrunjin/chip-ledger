import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { InsuranceHand, InsuranceHandPlayer } from "../domain";
import { type Card, makeCard } from "./cards";
import { potTotals } from "./pots";
import { RULE_30 } from "./rules";
import {
  blankInsuranceHand,
  buyOffer,
  dealCard,
  declineOffer,
  type HandOffer,
  handOffers,
  handPotEntries,
  handResult,
  offersDecided,
  playersReady,
  reviseOffer,
  stakeOf,
  undoDeal,
} from "./session";

const c = (text: string): Card => {
  const [rank, suit] = text as unknown as ["2", "s"];
  return makeCard(rank, suit);
};

const player = (playerId: string, chips: number, cards: readonly string[], cover = false) =>
  ({ playerId, chips, cover, cards: cards.map(c) }) satisfies InsuranceHandPlayer;

const aces = player("a", 1000, ["As", "Ad"]);
const kings = player("k", 1000, ["Ks", "Kd"]);

const hand = (overrides: Partial<InsuranceHand> = {}): InsuranceHand => ({
  ...blankInsuranceHand({ id: "h", organizerId: "o", gameId: "g", createdAt: 1 }),
  players: [aces, kings],
  board: [c("2c"), c("7h"), c("9d"), c("3c")],
  step: "buy",
  ...overrides,
});

const offerOf = (target: InsuranceHand): HandOffer => {
  const [offer] = handOffers(target, RULE_30);
  if (!offer) throw new Error("Expected an offer");
  return offer;
};

function bought(target: InsuranceHand) {
  const offer = offerOf(target);
  if (!offer.quote.ok) throw new Error("Expected a quote");
  const { fullPot, oddsHundredths } = offer.quote;
  return buyOffer(target, offer, "p", fullPot, oddsHundredths);
}

describe("cover players", () => {
  it("stakes what the deepest of the others put in", () => {
    const cover = player("c", 0, ["Qs", "Qd"], true);
    const players = [player("a", 300, ["As", "Ad"]), player("b", 500, ["Ks", "Kd"]), cover];
    expect(stakeOf(cover, players)).toBe(500);
    expect(potTotals(handPotEntries({ players, pools: [50] }))).toEqual({
      effectiveChips: 1350,
      deadChips: 50,
      uncalledChips: 0,
    });
  });

  it("allows only one", () => {
    expect(
      playersReady([player("a", 0, ["As", "Ad"], true), player("b", 0, ["Ks", "Kd"], true)]),
    ).toBe(false);
  });
});

describe("playersReady", () => {
  it("needs two players with chips and two cards each", () => {
    expect(playersReady([aces])).toBe(false);
    expect(playersReady([aces, { ...kings, chips: 0 }])).toBe(false);
    expect(playersReady([aces, { ...kings, cards: [c("Ks")] }])).toBe(false);
    expect(playersReady([aces, kings])).toBe(true);
    expect(playersReady([aces, player("c", 0, ["Ks", "Kd"], true)])).toBe(true);
  });
});

describe("offers", () => {
  it("offers the leader the cards that beat them", () => {
    const offer = offerOf(hand());
    expect(offer).toMatchObject({ key: "river-0-a", street: "river" });
    expect(offer.outs.toSorted()).toEqual([c("Kc"), c("Kh")].toSorted());
  });

  it("counts as decided once bought or turned down, and opens again on revising", () => {
    const start = hand();
    const offers = handOffers(start, RULE_30);
    expect(offersDecided(start, offers)).toBe(false);
    expect(offersDecided(bought(start), offers)).toBe(true);
    const declined = declineOffer(start, "river-0-a");
    expect(offersDecided(declined, offers)).toBe(true);
    expect(offersDecided(reviseOffer(declined, "river-0-a"), offers)).toBe(false);
    expect(reviseOffer(bought(start), "river-0-a").purchases).toEqual([]);
  });

  it.each([
    [
      "with different chances",
      [player("a", 1000, ["As", "Kh"]), player("b", 1000, ["Ad", "Kc"])],
      ["Qs", "7s", "2s", "3d"],
    ],
    [
      "with equal chances and nobody behind",
      [player("a", 1000, ["Ks", "Qs"]), player("b", 1000, ["Kh", "Qh"])],
      ["2s", "7s", "2h", "7h"],
    ],
    [
      "with different chances and someone behind",
      [
        player("a", 1000, ["As", "Kh"]),
        player("b", 1000, ["Ad", "Kc"]),
        player("c", 1000, ["Jd", "Td"]),
      ],
      ["Qs", "7s", "2s", "3d"],
    ],
  ])("refuses a tied lead %s", (_, players, board) => {
    const tied = hand({ players, board: board.map(c) });
    const offers = handOffers(tied, RULE_30).filter((o) => o.pot.leaders.length > 1);
    expect(offers.length).toBeGreaterThan(1);
    expect(offers.map((o) => o.quote)).toEqual(
      offers.map(() => ({ ok: false, block: "tied-lead" })),
    );
    expect(offersDecided(tied, offers)).toBe(true);
  });

  it("still sells equal tied leaders with someone behind them", () => {
    const tied = hand({
      players: [
        player("a", 1000, ["Js", "Jd"]),
        player("b", 1000, ["Jh", "Jc"]),
        player("c", 1000, ["5s", "5d"]),
      ],
      board: [c("2c"), c("7h"), c("9d"), c("3s")],
    });
    expect(handOffers(tied, RULE_30).map((o) => o.quote.ok)).toEqual([true, true]);
  });

  it("needs no decision when nothing can be sold", () => {
    const dead = hand({ players: [aces, player("x", 1000, ["As", "Ad"])] });
    expect(offersDecided(dead, [])).toBe(true);
  });
});

describe("dealCard", () => {
  it("settles what was sold on that card", () => {
    const start = hand({ board: hand().board.slice(0, 3) });
    const dealt = dealCard(bought(start), c("Kh"));
    expect(dealt.step).toBe("settle");
    expect(dealt.purchases[0]?.hit).toBe(true);
    expect(dealCard(bought(start), c("4h")).purchases[0]?.hit).toBe(false);
  });

  it("skips settling a turn with nothing sold, but always stops at the river", () => {
    const flop = hand({ board: hand().board.slice(0, 3) });
    expect(dealCard(flop, c("4h")).step).toBe("buy");
    expect(dealCard(hand(), c("4h")).step).toBe("settle");
  });

  it("takes a wrong card back and leaves earlier results alone", () => {
    const flop = hand({ board: hand().board.slice(0, 3) });
    const turn = dealCard(bought(flop), c("4h"));
    const river = dealCard(turn, c("5h"));
    const undone = undoDeal(river);
    expect(undone).toMatchObject({ step: "deal", board: turn.board });
    expect(undone.purchases[0]?.hit).toBe(false);
    expect(undoDeal(turn).purchases[0]).not.toHaveProperty("hit");
  });
});

describe("handResult", () => {
  it("counts settled purchases only", () => {
    const flop = hand({ board: hand().board.slice(0, 3) });
    expect(handResult(bought(flop)).seatChips).toBe(0);
  });

  it("gives the seat the premiums less the payouts", () => {
    const purchase = fc.record({
      premiumChips: fc.integer({ min: 1, max: 1000 }),
      payoutChips: fc.integer({ min: 1, max: 30_000 }),
      hit: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.array(purchase, { maxLength: 6 }), (rows) => {
        const purchases = rows.map((row, i) => ({
          ...row,
          id: `${i}`,
          offerKey: `${i}`,
          playerId: "a",
          street: "river" as const,
          outs: [],
          oddsHundredths: 300,
        }));
        const net = rows.reduce(
          (total, r) => total + r.premiumChips - (r.hit ? r.payoutChips : 0),
          0,
        );
        expect(handResult({ purchases }).seatChips).toBe(net);
      }),
    );
  });
});
