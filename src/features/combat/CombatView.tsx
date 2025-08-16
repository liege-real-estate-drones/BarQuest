
'use client';

import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect, useMemo } from 'react';
import { User, ArrowLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ActionStrip } from './components/ActionStrip';
import type { Talent } from '@/lib/types';
import { Card } from '@/components/ui/card';

export function CombatView() {
  const {
    player,
    enemy,
    flee,
    playerAttackProgress,
    startCombat,
    combatLog,
    currentDungeon,
    killCount,
    gameData,
  } = useGameStore((state) => ({
    player: state.player,
    enemy: state.combat.enemy,
    flee: state.flee,
    playerAttackProgress: state.combat.playerAttackProgress,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
    autoAttack: state.combat.autoAttack,
    currentDungeon: state.currentDungeon,
    killCount: state.combat.killCount,
    gameData: state.gameData,
    toggleAutoAttack: state.toggleAutoAttack,
  }));

  const activeSkills = useMemo(() => {
    return Object.entries(player.talents)
      .map(([talentId, rank]) => {
        if (rank > 0) {
          const talentData = gameData.talents.find(t => t.id === talentId);
          if (talentData && talentData.type === 'actif') {
            return talentData;
          }
        }
        return null;
      })
      .filter((t): t is Talent => t !== null);
  }, [player.talents, gameData.talents]);

  useEffect(() => {
    if (!enemy) {
      startCombat();
    }
  }, [enemy, startCombat]);
  
  if (!enemy || !currentDungeon) {
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
            <EntityDisplay entity={enemy} />
          </div>
          <div className="lg:col-span-2 flex flex-col gap-4">
            <CombatLog log={combatLog} />
            <Card className="flex-shrink-0">
                <ActionStrip 
                    onRetreat={flee}
                    skills={activeSkills}
                />
            </Card>
          </div>
      </main>
    </div>
  );
}
