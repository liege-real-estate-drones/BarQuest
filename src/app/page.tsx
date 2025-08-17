
'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { TownView } from '@/features/town/TownView';
import { CombatView } from '@/features/combat/CombatView';
import { useHydrated } from '@/hooks/useHydrated';
import { LoaderCircle } from 'lucide-react';
import { ChooseClassView } from '@/features/player/ChooseClassView';

export default function Home() {
  const hydrated = useHydrated();
  const { 
    view, 
    initializeGameData, 
    isInitialized, 
    player, 
    checkAndAssignStarterSkill, 
    rehydrateComplete 
  } = useGameStore((state) => ({
    view: state.view,
    initializeGameData: state.initializeGameData,
    isInitialized: state.isInitialized,
    player: state.player,
    checkAndAssignStarterSkill: state.checkAndAssignStarterSkill,
    rehydrateComplete: state.rehydrateComplete
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGameData() {
        if (isInitialized) {
            setIsLoading(false);
            return;
        };

        try {
            const dataPaths = [
                'dungeons', 'monsters', 'items', 'talents', 'skills', 
                'affixes', 'classes', 'quests', 'factions'
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
            
            const gameDataPayload = {
                dungeons: jsonData[0]?.dungeons || [],
                monsters: jsonData[1]?.monsters || [],
                items: jsonData[2]?.items || [],
                talents: jsonData[3]?.talents || [],
                skills: jsonData[4]?.skills || [],
                affixes: jsonData[5]?.affixes || [],
                classes: jsonData[6]?.classes || [],
                quests: jsonData[7]?.quests || [],
                factions: jsonData[8]?.factions || [],
            };
            
            initializeGameData(gameDataPayload);
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to load game data:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred while loading game data.");
            setIsLoading(false);
        }
    }
    
    if (hydrated && rehydrateComplete) {
        loadGameData();
    }
  }, [hydrated, rehydrateComplete, initializeGameData, isInitialized]);

  useEffect(() => {
    if (isInitialized && player.classeId) {
        checkAndAssignStarterSkill();
    }
  }, [isInitialized, player.classeId, checkAndAssignStarterSkill]);
  
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
      {view === 'TOWN' && <TownView />}
      {view === 'COMBAT' && <CombatView />}
    </main>
  );
}
