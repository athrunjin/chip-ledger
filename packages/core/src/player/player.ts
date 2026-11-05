/** Player list: name validation and search. */
import { INSURANCE_PLAYER_NAME, type Player } from "../domain";

export const MAX_PLAYER_NAME_LENGTH = 30;

/** Issue codes. The UI decides the wording. */
export type PlayerNameIssue = "empty" | "too-long" | "duplicate" | "reserved";

export type ParsedPlayerName =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly issue: PlayerNameIssue };

/** For comparing names: removes whitespace and ignores case. */
function comparable(text: string): string {
  return text.replace(/\s/g, "").toLowerCase();
}

/**
 * Validates and normalizes a name. `otherNames` holds the other players' names: players are picked by name,
 * so duplicates would pick the wrong person and are not allowed. Real namesakes can be written like 小王2.
 */
export function parsePlayerName(input: string, otherNames: readonly string[]): ParsedPlayerName {
  const name = input.trim().replace(/\s+/g, " ");
  if (name === "") return { ok: false, issue: "empty" };
  if ([...name].length > MAX_PLAYER_NAME_LENGTH) return { ok: false, issue: "too-long" };
  const key = comparable(name);
  if (key === comparable(INSURANCE_PLAYER_NAME)) return { ok: false, issue: "reserved" };
  if (otherNames.some((other) => comparable(other) === key)) {
    return { ok: false, issue: "duplicate" };
  }
  return { ok: true, name };
}

/** Searches by name or pinyin initials, ignoring case and keeping the original order. An empty query returns everyone. */
export function searchPlayers(players: readonly Player[], query: string): Player[] {
  const key = comparable(query);
  if (key === "") return [...players];
  return players.filter(
    (player) => comparable(player.name).includes(key) || player.initials.includes(key),
  );
}
