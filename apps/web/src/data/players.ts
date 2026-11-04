import type { Player } from "@holdem/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { repository } from ".";

const PLAYERS_KEY = ["players"] as const;

export function usePlayers() {
  return useQuery({ queryKey: PLAYERS_KEY, queryFn: () => repository.players.list() });
}

export function useSavePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (player: Player) => repository.players.save(player),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PLAYERS_KEY }),
  });
}
