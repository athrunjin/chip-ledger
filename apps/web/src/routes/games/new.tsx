import {
  createGame,
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
  toGameSettingsForm,
} from "@holdem/core";
import { createFileRoute } from "@tanstack/react-router";
import { GameSettingsForm } from "@/components/game/GameSettingsForm";
import { Page } from "@/components/Page";
import { GUEST_ORGANIZER_ID } from "@/data";
import { useGames, useSaveGame } from "@/data/games";

export const Route = createFileRoute("/games/new")({
  component: NewGamePage,
});

function NewGamePage() {
  const navigate = Route.useNavigate();
  const games = useGames();
  const saveGame = useSaveGame();

  function handleSubmit(settings: GameSettings) {
    const game = createGame(
      { id: crypto.randomUUID(), organizerId: GUEST_ORGANIZER_ID, createdAt: Date.now() },
      settings,
    );
    saveGame.mutate(game, {
      onSuccess: () =>
        navigate({ to: "/games/$gameId", params: { gameId: game.id }, replace: true }),
    });
  }

  return (
    <Page title="开一局">
      {!games.isPending && (
        <GameSettingsForm
          // Carry over the latest game's settings by default
          initial={toGameSettingsForm(games.data?.[0] ?? DEFAULT_GAME_SETTINGS)}
          submitLabel="开局"
          saving={saveGame.isPending}
          saveFailed={saveGame.isError}
          onSubmit={handleSubmit}
        />
      )}
    </Page>
  );
}
