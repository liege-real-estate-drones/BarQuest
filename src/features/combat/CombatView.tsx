
'use client';

import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect, useMemo, useState } from 'react';
import { User, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ActionStrip } from './components/ActionStrip';
import type { Talent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CombatView() {
  const {
    player,
    enemies,
    flee,
    playerAttackProgress,
    startCombat,
    combatLog,
    currentDungeon,
    killCount,
    gameData,
    cycleTarget,
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
  }));
  
  const [targetIndex, setTargetIndex] = useState(0);

  const equippedSkills = useMemo(() => {
    if (!player?.equippedSkills) return [];
    return player.equippedSkills
      .map(skillId => {
        if (!skillId) return null;
        return gameData.talents.find(t => t.id === skillId) || null;
      })
      .filter((t): t is Talent => t !== null);
  }, [player?.equippedSkills, gameData.talents]);

  useEffect(() => {
    if (enemies && enemies.length === 0) {
      startCombat();
    }
  }, [enemies, startCombat]);
  
  useEffect(() => {
    setTargetIndex(0);
  }, [enemies?.length]);

  const handleCycleTarget = () => {
    cycleTarget();
  };
  
  if (!enemies || enemies.length === 0 || !currentDungeon) {
    return <div className="flex items-center justify-center h-screen">Finding a target...</div>;
  }

  const dungeonProgress = (killCount / currentDungeon.killTarget) * 100;

  return (
    <div className="flex flex-col h-screen w-full p-4 gap-4 font-code bg-background text-foreground">
      <header className="flex-shrink-0 flex justify-between items-center border-b pb-2 gap-4">
        <Button variant="ghost" size="icon" onClick={flee}>
            <ArrowLeft />
        </Button>
        <div className="flex-grow">
            <div className="flex justify-between text-sm mb-1">
                <h1 className="text-xl font-bold font-headline text-primary">{currentDungeon.name}</h1>
                <span>{killCount} / {currentDungeon.killTarget}</span>
            </div>
            <Progress value={dungeonProgress} className="h-2" />
        </div>
        <div className="flex items-center space-x-2">
            <User />
            <Progress value={playerAttackProgress * 100} className="w-32 h-2" />
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <EntityDisplay entity={player} isPlayer />
             <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 pr-4">
                    {enemies.map((enemy, index) => (
                        <EntityDisplay key={enemy.id} entity={enemy} isTarget={index === targetIndex} />
                    ))}
                </div>
            </ScrollArea>
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
            <CombatLog log={combatLog} />
            <Card className="flex-shrink-0">
                <ActionStrip 
                    onRetreat={flee}
                    skills={equippedSkills}
                    onCycleTarget={handleCycleTarget}
                />
            </Card>
          </div>
      </main>
    </div>
  );
}
