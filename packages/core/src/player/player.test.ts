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
  it("去掉首尾空白，合并中间空白", () => {
    expect(parsePlayerName("  老  王 ", [])).toEqual({ ok: true, name: "老 王" });
  });

  it("名字不能为空", () => {
    expect(parsePlayerName("   ", [])).toEqual({ ok: false, issue: "empty" });
  });

  it("按字符数限制长度，生僻字算一个字", () => {
    const longest = "𠮷".repeat(MAX_PLAYER_NAME_LENGTH);
    expect(parsePlayerName(longest, []).ok).toBe(true);
    expect(parsePlayerName(`${longest}x`, [])).toEqual({ ok: false, issue: "too-long" });
  });

  it("重名时忽略大小写和空白", () => {
    expect(parsePlayerName("BO B", ["bob"])).toEqual({ ok: false, issue: "duplicate" });
  });
});

describe("searchPlayers", () => {
  const players = [player("张三", "zs"), player("李四", "ls"), player("Alice", "alice")];
  const names = (query: string) => searchPlayers(players, query).map((p) => p.name);

  it("查询为空时返回全部", () => {
    expect(names("  ")).toEqual(["张三", "李四", "Alice"]);
  });

  it("按名字搜索，不区分大小写", () => {
    expect(names("李")).toEqual(["李四"]);
    expect(names("ALI")).toEqual(["Alice"]);
  });

  it("按拼音首字母搜索", () => {
    expect(names("ZS")).toEqual(["张三"]);
    expect(names("s")).toEqual(["张三", "李四"]);
  });

  it("没有匹配时返回空", () => {
    expect(names("王")).toEqual([]);
  });

  it("任何玩家都能用自己的名字或首字母搜到", () => {
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
