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

export function CombatView() {
  const {
    player,
    enemy,
    playerAttack,
    flee,
    playerAttackProgress,
    startCombat,
    combatLog,
    autoAttack,
    currentDungeon,
    killCount,
    gameData,
    toggleAutoAttack,
  } = useGameStore((state) => ({
    player: state.player,
    enemy: state.combat.enemy,
    playerAttack: state.playerAttack,
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

  const handleAttack = () => {
    if (playerAttackProgress >= 1) {
      playerAttack();
    }
  };

  const dungeonProgress = (killCount / currentDungeon.killTarget) * 100;

  return (
    <div className="flex h-screen w-full flex-col p-4 gap-4 font-code bg-background text-foreground">
      <header className="flex justify-between items-center border-b pb-2 gap-4 flex-shrink-0">
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

      <main className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          <div className="grid grid-rows-2 gap-4">
            <EntityDisplay entity={player} isPlayer />
            <EntityDisplay entity={enemy} />
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <CombatLog log={combatLog} />
          </div>
      </main>
      
      <footer className="flex-shrink-0">
       <ActionStrip 
          onSkill1={handleAttack}
          onPotion={() => console.log('potion used')}
          onRetreat={flee}
          isSkill1Ready={playerAttackProgress >= 1}
          isSkill1Auto={autoAttack}
          skills={activeSkills}
          toggleAutoAttack={toggleAutoAttack}
       />
      </footer>
    </div>
  );
}
