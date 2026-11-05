/** A chip count with an explicit sign, e.g. +200, −50 or 0. */
export function formatSignedChips(chips: number) {
  const value = Math.abs(chips).toLocaleString("zh-CN");
  if (chips === 0) return value;
  return chips > 0 ? `+${value}` : `−${value}`;
}

/** Text color for a win or loss. */
export function netColor(chips: number) {
  if (chips === 0) return "text-muted";
  return chips > 0 ? "text-win" : "text-loss";
}

/** A chip difference with its cash value, e.g. +200 筹码（¥200）. */
export function formatDifference(chips: number, cash: string) {
  return `${formatSignedChips(chips)} 筹码（${cash}）`;
}
