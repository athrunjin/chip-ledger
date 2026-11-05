/** Splits all-in contributions into the main pot and side pots. */

export interface PotEntry {
  readonly playerId: string;
  /** Chips this player has put in during the hand. */
  readonly chips: number;
  /** Folded players' chips stay in the pots, but they cannot win them. */
  readonly folded?: boolean;
}

export interface Pot {
  readonly amountChips: number;
  /** Players who can win this pot. */
  readonly playerIds: readonly string[];
  /** What each eligible player put into this pot. */
  readonly stakes: Readonly<Record<string, number>>;
}

/**
 * One layer per distinct contribution among live players: each player adds what they put in between
 * the previous level and this one. Folded chips above the top level join the last pot.
 * A top layer with one player is their uncalled excess, which goes straight back to them.
 */
export function buildPots(entries: readonly PotEntry[]): Pot[] {
  const live = entries.filter((e) => !e.folded && e.chips > 0);
  const levels = [...new Set(live.map((e) => e.chips))].toSorted((a, b) => a - b);
  const top = levels.at(-1) ?? 0;

  let previous = 0;
  return levels.map((level) => {
    const layer = (chips: number) => Math.max(0, Math.min(chips, level) - previous);
    const eligible = live.filter((e) => e.chips >= level);
    const stakes = Object.fromEntries(eligible.map((e) => [e.playerId, layer(e.chips)]));
    const amountChips = entries.reduce((total, e) => {
      const beyondTop = e.folded && level === top ? Math.max(0, e.chips - top) : 0;
      return total + layer(e.chips) + beyondTop;
    }, 0);
    previous = level;
    return { amountChips, playerIds: eligible.map((e) => e.playerId), stakes };
  });
}
