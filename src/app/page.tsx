
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
  const { view, initializeGameData, isInitialized, player, checkAndAssignStarterSkill, rehydrateComplete } = useGameStore((state) => ({
    view: state.view,
    initializeGameData: state.initializeGameData,
    isInitialized: state.isInitialized,
    player: state.player,
    checkAndAssignStarterSkill: state.checkAndAssignStarterSkill,
    rehydrateComplete: state.rehydrateComplete
  }));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGameData() {
        if (isInitialized) return;
        try {
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
            ] = await Promise.all([
                fetch('/data/dungeons.json').then(res => res.json()),
                fetch('/data/monsters.json').then(res => res.json()),
                fetch('/data/items.json').then(res => res.json()),
                fetch('/data/talents.json').then(res => res.json()),
                fetch('/data/skills.json').then(res => res.json()),
                fetch('/data/affixes.json').then(res => res.json()),
                fetch('/data/classes.json').then(res => res.json()),
                fetch('/data/quests.json').then(res => res.json()),
                fetch('/data/factions.json').then(res => res.json()),
            ]);
            
            initializeGameData({
                dungeons: dungeonsData,
                monsters: monstersData,
                items: itemsData,
                talents: talentsData,
                skills: skillsData,
                affixes: affixesData,
                classes: classesData,
                quests: questsData,
                factions: factionsData
            });
        } catch (error) {
            console.error("Failed to load game data:", error);
        }
    }
    
    if (hydrated && rehydrateComplete) {
        loadGameData();
    }
  }, [hydrated, rehydrateComplete, initializeGameData, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
        setIsLoading(false);
        if(player.classeId) {
            checkAndAssignStarterSkill();
        }
    }
  }, [isInitialized, player.classeId, checkAndAssignStarterSkill]);
  
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
