import type { Game } from "@holdem/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { repository } from ".";

const GAMES_KEY = ["games"] as const;

export function useGames() {
  return useQuery({ queryKey: GAMES_KEY, queryFn: () => repository.games.list() });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: [...GAMES_KEY, id],
    queryFn: async () => (await repository.games.get(id)) ?? null,
  });
}

export function useHasLedgerEvents(gameId: string) {
  return useQuery({
    queryKey: ["ledger", gameId, "has-events"],
    queryFn: async () => (await repository.ledger.listByGame(gameId)).length > 0,
  });
}

export function useSaveGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (game: Game) => repository.games.save(game),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GAMES_KEY }),
  });
}
