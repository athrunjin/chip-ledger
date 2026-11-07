import type { Player } from "@holdem-knight/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toInitials } from "@/lib/pinyin";
import { GUEST_ORGANIZER_ID, repository } from ".";

const PLAYERS_KEY = ["players"] as const;

export function newPlayer(name: string): Player {
  return {
    id: crypto.randomUUID(),
    organizerId: GUEST_ORGANIZER_ID,
    name,
    initials: toInitials(name),
    createdAt: Date.now(),
  };
}

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
