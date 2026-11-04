/** 玩家库：名字校验和搜索。 */
import type { Player } from "../domain";

export const MAX_PLAYER_NAME_LENGTH = 30;

/** 问题代码。文案由界面决定。 */
export type PlayerNameIssue = "empty" | "too-long" | "duplicate";

export type ParsedPlayerName =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly issue: PlayerNameIssue };

/** 用来比较名字：去掉空白，忽略大小写。 */
function comparable(text: string): string {
  return text.replace(/\s/g, "").toLowerCase();
}

/**
 * 校验并规范化名字。`otherNames` 是其他玩家的名字：玩家库靠名字选人，
 * 同名会选错，所以不允许重名，真有同名的可以写成「小王2」。
 */
export function parsePlayerName(input: string, otherNames: readonly string[]): ParsedPlayerName {
  const name = input.trim().replace(/\s+/g, " ");
  if (name === "") return { ok: false, issue: "empty" };
  if ([...name].length > MAX_PLAYER_NAME_LENGTH) return { ok: false, issue: "too-long" };
  const key = comparable(name);
  if (otherNames.some((other) => comparable(other) === key)) {
    return { ok: false, issue: "duplicate" };
  }
  return { ok: true, name };
}

/** 按名字或拼音首字母搜索，不区分大小写，保持原有顺序。查询为空时返回全部。 */
export function searchPlayers(players: readonly Player[], query: string): Player[] {
  const key = comparable(query);
  if (key === "") return [...players];
  return players.filter(
    (player) => comparable(player.name).includes(key) || player.initials.includes(key),
  );
}
