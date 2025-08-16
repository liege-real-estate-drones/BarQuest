
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
            const responses = await Promise.all([
                fetch('/data/dungeons.json'),
                fetch('/data/monsters.json'),
                fetch('/data/items.json'),
                fetch('/data/talents.json'),
                fetch('/data/skills.json'),
                fetch('/data/affixes.json'),
                fetch('/data/classes.json'),
                fetch('/data/quests.json'),
                fetch('/data/factions.json'),
            ]);

            for (const response of responses) {
              if (!response.ok) {
                throw new Error(`Failed to fetch ${response.url}: ${response.statusText}`);
              }
            }

            const [
                dungeonsData,
                monstersData,
                itemsData,
                talentsData,
                skillsData,
                affixesData,
                classesData,
                questsData,
                factionsData
            ] = await Promise.all(responses.map(r => r.json()));

            const gameDataPayload = {
                dungeons: dungeonsData.dungeons || [],
                monsters: monstersData.monsters || [],
                items: itemsData.items || [],
                talents: talentsData.talents || [],
                skills: skillsData.skills || [],
                affixes: affixesData.affixes || [],
                classes: classesData.classes || [],
                quests: questsData.quests || [],
                factions: factionsData.factions || []
            };

            // Data validation
            for (const key in gameDataPayload) {
                if (!Array.isArray((gameDataPayload as any)[key])) {
                    throw new Error(`Data validation failed: ${key} is not an array.`);
                }
            }
            
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
