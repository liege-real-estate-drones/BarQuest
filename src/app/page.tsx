'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { TownView } from '@/features/town/TownView';
import { CombatView } from '@/features/combat/CombatView';
import { useHydrated } from '@/hooks/useHydrated';
import { LoaderCircle } from 'lucide-react';
import { Dungeon, Monstre, Item, Talent, Affixe, Classe, Quete, Faction } from '@/lib/types';

export default function Home() {
  const { view, initializeGameData, isInitialized } = useGameStore((state) => ({
    view: state.view,
    initializeGameData: state.initializeGameData,
    isInitialized: state.isInitialized,
  }));
  const hydrated = useHydrated();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGameData() {
      try {
        const [dungeons, monsters, items, talents, affixes, classes, quests, factions] = await Promise.all([
          fetch('/data/dungeons.json').then(res => res.json()) as Promise<Dungeon[]>,
          fetch('/data/monsters.json').then(res => res.json()) as Promise<Monstre[]>,
          fetch('/data/items.json').then(res => res.json()) as Promise<Item[]>,
          fetch('/data/talents.json').then(res => res.json()) as Promise<Talent[]>,
          fetch('/data/affixes.json').then(res => res.json()) as Promise<Affixe[]>,
          fetch('/data/classes.json').then(res => res.json()) as Promise<Classe[]>,
          fetch('/data/quests.json').then(res => res.json()) as Promise<Quete[]>,
          fetch('/data/factions.json').then(res => res.json()) as Promise<Faction[]>,
        ]);
        initializeGameData({ dungeons, monsters, items, talents, affixes, classes, quests, factions });
      } catch (error) {
        console.error("Failed to load game data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (hydrated && !isInitialized) {
      loadGameData();
    } else if (isInitialized) {
      setIsLoading(false);
    }
  }, [hydrated, initializeGameData, isInitialized]);
  
  if (!hydrated || isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
        <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-xl text-foreground">Loading BarQuest...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {view === 'TOWN' && <TownView />}
      {view === 'COMBAT' && <CombatView />}
    </main>
  );
}
