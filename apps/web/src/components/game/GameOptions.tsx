import type { Game } from "@holdem/core";
import { cn } from "@/lib/cn";

/** The options switched on for a game. Rake, table fee and wages join here once games have them. */
function gameOptions(game: Game) {
  const options: { label: string; className: string }[] = [];
  if (game.insurance) options.push({ label: "保险", className: "text-highlight" });
  return options;
}

/** One small colored label per option that is on. The caller lays them out. */
export function GameOptions({ game }: { game: Game }) {
  return gameOptions(game).map(({ label, className }) => (
    <span key={label} className={cn("text-xs font-medium", className)}>
      {label}
    </span>
  ));
}
