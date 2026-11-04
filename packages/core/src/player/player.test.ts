import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Player } from "../domain";
import { MAX_PLAYER_NAME_LENGTH, parsePlayerName, searchPlayers } from "./player";

const player = (name: string, initials: string): Player => ({
  id: name,
  organizerId: "me",
  name,
  initials,
  createdAt: 1,
});

describe("parsePlayerName", () => {
  it("trims the ends and collapses inner whitespace", () => {
    expect(parsePlayerName("  老  王 ", [])).toEqual({ ok: true, name: "老 王" });
  });

  it("requires a name", () => {
    expect(parsePlayerName("   ", [])).toEqual({ ok: false, issue: "empty" });
  });

  it("limits length by characters, counting rare characters as one", () => {
    const longest = "𠮷".repeat(MAX_PLAYER_NAME_LENGTH);
    expect(parsePlayerName(longest, []).ok).toBe(true);
    expect(parsePlayerName(`${longest}x`, [])).toEqual({ ok: false, issue: "too-long" });
  });

  it("ignores case and whitespace when checking duplicates", () => {
    expect(parsePlayerName("BO B", ["bob"])).toEqual({ ok: false, issue: "duplicate" });
  });
});

describe("searchPlayers", () => {
  const players = [player("张三", "zs"), player("李四", "ls"), player("Alice", "alice")];
  const names = (query: string) => searchPlayers(players, query).map((p) => p.name);

  it("returns everyone for an empty query", () => {
    expect(names("  ")).toEqual(["张三", "李四", "Alice"]);
  });

  it("searches by name, ignoring case", () => {
    expect(names("李")).toEqual(["李四"]);
    expect(names("ALI")).toEqual(["Alice"]);
  });

  it("searches by pinyin initials", () => {
    expect(names("ZS")).toEqual(["张三"]);
    expect(names("s")).toEqual(["张三", "李四"]);
  });

  it("returns nothing when no one matches", () => {
    expect(names("王")).toEqual([]);
  });

  it("finds every player by their own name or initials", () => {
    const anyPlayer = fc
      .record({
        name: fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
        initials: fc.stringMatching(/^[a-z]{1,8}$/),
      })
      .map(({ name, initials }) => player(name, initials));
    fc.assert(
      fc.property(fc.array(anyPlayer), anyPlayer, (others, target) => {
        const all = [...others, target];
        expect(searchPlayers(all, target.name)).toContain(target);
        expect(searchPlayers(all, target.initials)).toContain(target);
      }),
    );
  });
});
