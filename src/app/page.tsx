
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { TownView } from '@/features/town/TownView';
import { CombatView } from '@/features/combat/CombatView';
import { DungeonCompletionView } from '@/features/dungeons/DungeonCompletionView';
import { useHydrated } from '@/hooks/useHydrated';
import { LoaderCircle } from 'lucide-react';
import { ChooseClassView } from '@/features/player/ChooseClassView';
import type { GameData } from '@/lib/types';

export default function Home() {
  const hydrated = useHydrated();
  const { 
    view, 
    initializeGameData, 
    isInitialized, 
    player,
    recalculateStats,
    rehydrateComplete 
  } = useGameStore((state) => ({
    view: state.view,
    initializeGameData: state.initializeGameData,
    isInitialized: state.isInitialized,
    player: state.player,
    recalculateStats: state.recalculateStats,
    rehydrateComplete: state.rehydrateComplete
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGameData = useCallback(async () => {
    if (isInitialized) {
        setIsLoading(false);
        return;
    };

    try {
        const dataPaths: (keyof GameData)[] = [
            'dungeons', 'monsters', 'items', 'talents', 'skills', 
            'affixes', 'classes', 'quests', 'factions', 'sets', 'recipes', 'enchantments', 'components'
        ];
        
        const responses = await Promise.all(
            dataPaths.map(path => fetch(`/data/${path}.json`))
        );

        for (const response of responses) {
          if (!response.ok) {
            throw new Error(`Failed to fetch ${response.url}: ${response.statusText}`);
          }
        }

        const jsonData = await Promise.all(responses.map(res => res.json()));
        
        const gameDataPayload: Partial<GameData> = {};
        dataPaths.forEach((path, index) => {
            const data = jsonData[index];
            if (data && data[path] && Array.isArray(data[path])) {
                // Handles nested objects like { "quests": [...] }
                gameDataPayload[path as keyof GameData] = data[path];
            } else if (Array.isArray(data)) {
                // Handles direct arrays like [...]
                gameDataPayload[path as keyof GameData] = data;
            } else {
                // Fallback for any other unexpected format
                gameDataPayload[path as keyof GameData] = [];
            }
        });
        
        initializeGameData(gameDataPayload);
        setIsLoading(false);
    } catch (err) {
        console.error("Failed to load game data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while loading game data.");
        setIsLoading(false);
    }
  }, [isInitialized, initializeGameData]);

  useEffect(() => {
    if (hydrated && rehydrateComplete) {
        loadGameData();
    }
  }, [hydrated, rehydrateComplete, loadGameData]);

  useEffect(() => {
    if (isInitialized && player.classeId) {
        recalculateStats();
    }
  }, [isInitialized, player.classeId, recalculateStats]);
  
  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-red-500">
        <h1 className="text-2xl mb-4">Error Loading Game Data</h1>
        <p className="font-mono bg-destructive/20 p-4 rounded">{error}</p>
      </main>
    );
  }

  if (!hydrated || isLoading || !rehydrateComplete) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
        <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-foreground">Loading BarQuest...</p>
      </main>
    );
  }

  if (!player.classeId) {
    return <ChooseClassView />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {view === 'MAIN' && <TownView />}
      {view === 'COMBAT' && <CombatView />}
      {view === 'DUNGEON_COMPLETED' && <DungeonCompletionView />}
    </main>
  );
}
