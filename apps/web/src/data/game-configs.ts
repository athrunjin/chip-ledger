import type { GameSettings, SavedGameConfig } from "@holdem/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GUEST_ORGANIZER_ID, repository } from ".";

const CONFIGS_KEY = ["game-configs"] as const;

export function useGameConfigs() {
  return useQuery({ queryKey: CONFIGS_KEY, queryFn: () => repository.gameConfigs.list() });
}

export function newGameConfig(name: string, settings: GameSettings): SavedGameConfig {
  return {
    id: crypto.randomUUID(),
    organizerId: GUEST_ORGANIZER_ID,
    name,
    settings,
    createdAt: Date.now(),
  };
}

export function useSaveGameConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: SavedGameConfig) => repository.gameConfigs.save(config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}

export function useRemoveGameConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repository.gameConfigs.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONFIGS_KEY }),
  });
}
