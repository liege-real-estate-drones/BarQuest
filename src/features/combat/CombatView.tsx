
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
    return <div className="flex items-center justify-center h-screen">Loading dungeon...</div>;
  }

  if (enemies.length === 0 && killCount < currentDungeon.killTarget) {
    return <div className="flex items-center justify-center h-screen">Finding a target...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full font-code bg-background text-foreground">
      {/* Header */}
      <header className="flex-shrink-0 flex justify-between items-center border-b p-4 gap-4">
        <Button variant="ghost" size="icon" onClick={flee} className="flex-shrink-0">
            <ArrowLeft />
        </Button>
        <div className="flex-grow">
            <div className="flex justify-between items-center text-sm mb-1">
                <h1 className="text-xl font-bold font-headline text-primary">{currentDungeon.name}</h1>
                <div className="flex items-center gap-4">
                    <span className="text-lg">Kills: {killCount} / {currentDungeon.killTarget}</span>
                    <div className="w-48 text-center">
                        <p className="text-xs text-muted-foreground">Attack</p>
                        <Progress value={playerAttackProgress * 100} className="h-2 mt-1" />
                    </div>
                </div>
            </div>
            <Progress value={(killCount / currentDungeon.killTarget) * 100} className="h-2" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 min-h-0">
          {/* Left Column - Player */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <EntityDisplay entity={player} isPlayer />
          </div>

          {/* Middle Column - Enemies */}
          <div className="lg:col-span-2 flex flex-col gap-4">
             <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                    {enemies.map((enemy, index) => (
                        <EntityDisplay key={enemy.id} entity={enemy} isTarget={index === targetIndex} />
                    ))}
                </div>
            </ScrollArea>
          </div>
          
          {/* Right Column - Info */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            <DungeonInfo dungeon={currentDungeon} />
            <CombatLog log={combatLog} />
          </div>
      </main>

      {/* Footer - Action Strip */}
       <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm">
            <ActionStrip 
                onRetreat={flee}
                skills={equippedSkills}
                onCycleTarget={handleCycleTarget}
            />
        </footer>
    </div>
  );
}
