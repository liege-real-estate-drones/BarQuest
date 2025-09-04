
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { TownView } from '@/features/town/TownView';
import { CombatView } from '@/features/combat/CombatView';
import { DungeonCompletionView } from '@/features/dungeons/DungeonCompletionView';
import { useHydrated } from '@/hooks/useHydrated';
import { LoaderCircle } from 'lucide-react';
import { ChooseClassView } from '@/features/player/ChooseClassView';
import { HeroSelectionView } from '@/features/hero-selection/HeroSelectionView';
import type { GameData } from '@/lib/types';

export default function Home() {
  const hydrated = useHydrated();
  const {
    view,
    initializeGameData,
    isInitialized,
    recalculateStats,
    rehydrateComplete,
    activeHeroId,
    isCreatingCharacter,
    getActiveHero,
  } = useGameStore((state) => ({
    view: state.view,
    initializeGameData: state.initializeGameData,
    isInitialized: state.isInitialized,
    recalculateStats: state.recalculateStats,
    rehydrateComplete: state.rehydrateComplete,
    activeHeroId: state.activeHeroId,
    isCreatingCharacter: state.isCreatingCharacter,
    getActiveHero: state.getActiveHero,
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
                gameDataPayload[path as keyof GameData] = data[path];
            } else {
                gameDataPayload[path as keyof GameData] = data;
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
    const activeHero = getActiveHero();
    if (isInitialized && activeHero?.player.classeId) {
        recalculateStats();
    }
  }, [isInitialized, activeHeroId, recalculateStats, getActiveHero]);
  
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

  if (isCreatingCharacter) {
    return <ChooseClassView />;
  }

  if (!activeHeroId) {
    return <HeroSelectionView />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {view === 'MAIN' && <TownView />}
      {view === 'COMBAT' && <CombatView />}
      {view === 'DUNGEON_COMPLETED' && <DungeonCompletionView />}
    </main>
  );
}
