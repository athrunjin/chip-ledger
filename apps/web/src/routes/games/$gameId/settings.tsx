import { type GameSettings, toGameSettingsForm, updateGameSettings } from "@holdem/core";
import { createFileRoute } from "@tanstack/react-router";
import { GameSettingsForm } from "@/components/game/GameSettingsForm";
import { Page } from "@/components/Page";
import { useGame, useHasLedgerEvents, useSaveGame } from "@/data/games";

export const Route = createFileRoute("/games/$gameId/settings")({
  component: GameSettingsPage,
});

function GameSettingsPage() {
  const { gameId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { data: game } = useGame(gameId);
  const { data: hasLedgerEvents } = useHasLedgerEvents(gameId);
  const saveGame = useSaveGame();

  if (!game || hasLedgerEvents === undefined) return null;

  function handleSubmit(settings: GameSettings) {
    if (!game || hasLedgerEvents === undefined) return;
    saveGame.mutate(updateGameSettings(game, settings, { hasLedgerEvents }), {
      onSuccess: () => navigate({ to: "/games/$gameId", params: { gameId }, replace: true }),
    });
  }

  return (
    <Page title="修改设置">
      <GameSettingsForm
        initial={toGameSettingsForm(game)}
        submitLabel="保存"
        ratioLocked={hasLedgerEvents}
        saving={saveGame.isPending}
        saveFailed={saveGame.isError}
        onSubmit={handleSubmit}
      />
    </Page>
  );
}
