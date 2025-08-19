'use client';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ActionStrip } from './components/ActionStrip';
import type { Skill } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DungeonInfo } from './components/DungeonInfo';

export function CombatView() {
  const {
    player,
    enemies,
    flee,
    startCombat,
    combatLog,
    currentDungeon,
    killCount,
    gameData,
    cycleTarget,
    targetIndex,
    playerAttackProgress
  } = useGameStore((state) => ({
    player: state.player,
    enemies: state.combat.enemies,
    flee: state.flee,
    playerAttackProgress: state.combat.playerAttackProgress,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
    currentDungeon: state.currentDungeon,
    killCount: state.combat.killCount,
    gameData: state.gameData,
    cycleTarget: state.cycleTarget,
    targetIndex: state.combat.targetIndex,
  }));

  const equippedSkills = useMemo(() => {
    if (!player?.equippedSkills) return [];
    return player.equippedSkills
      .map(skillId => {
        if (!skillId) return null;
        return gameData.skills.find(t => t.id === skillId) || null;
      })
      .filter((t): t is Skill => t !== null);
  }, [player?.equippedSkills, gameData.skills]);

  useEffect(() => {
    if (enemies && enemies.length === 0 && currentDungeon) {
      if (killCount < currentDungeon.killTarget) {
        startCombat();
      }
    }
  }, [enemies, startCombat, killCount, currentDungeon]);
  
  const handleCycleTarget = () => {
    cycleTarget();
  };
  
  if (!currentDungeon) {
    return <div className="flex items-center justify-center h-screen">Chargement du donjon...</div>;
  }

  if (enemies.length === 0 && killCount < currentDungeon.killTarget) {
    return <div className="flex items-center justify-center h-screen">Recherche d'une cible...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full font-code bg-background text-foreground">
      <header className="flex-shrink-0 flex items-center border-b p-4 gap-4">
        <Button variant="ghost" size="icon" onClick={flee} className="flex-shrink-0">
          <ArrowLeft />
        </Button>
        <div className="flex-grow">
          <DungeonInfo dungeon={currentDungeon} />
        </div>
      </header>

      <main className="flex-grow flex flex-col p-4 gap-4 min-h-0 overflow-y-auto">
        <div className="flex-grow">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
              {enemies.map((enemy, index) => (
                <EntityDisplay key={enemy.id} entity={enemy} isTarget={index === targetIndex} />
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="flex-shrink-0">
          <CombatLog log={combatLog} />
        </div>
      </main>

      <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm p-4 space-y-4">
        <EntityDisplay entity={player} isPlayer />
        <ActionStrip
          onRetreat={flee}
          skills={equippedSkills}
          onCycleTarget={handleCycleTarget}
        />
      </footer>
    </div>
  );
}