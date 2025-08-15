'use client';

import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { AttackRing } from './components/AttackRing';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect, useMemo } from 'react';
import { Bot, User, Swords, ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
    enemyAttackProgress,
    startCombat,
    combatLog,
    autoAttack,
    toggleAutoAttack,
    currentDungeon,
    killCount,
    gameData,
  } = useGameStore((state) => ({
    player: state.player,
    enemy: state.combat.enemy,
    playerAttack: state.playerAttack,
    flee: state.flee,
    playerAttackProgress: state.combat.playerAttackProgress,
    enemyAttackProgress: state.combat.enemyAttackProgress,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
    autoAttack: state.combat.autoAttack,
    toggleAutoAttack: state.toggleAutoAttack,
    currentDungeon: state.currentDungeon,
    killCount: state.combat.killCount,
    gameData: state.gameData,
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
    // Auto-start combat when view loads if no enemy
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
      <header className="flex justify-between items-center border-b pb-2 gap-4">
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow min-h-0">
        {/* Player & Enemy Panel */}
        <div className="flex flex-col gap-4">
            <EntityDisplay entity={player} isPlayer />
            <EntityDisplay entity={enemy} />
        </div>


        {/* Arena & Log */}
        <div className="flex flex-col gap-4 min-h-0">
            {/* Arena / Visuals */}
            <div className="flex flex-col items-center justify-center gap-4 border rounded-lg p-4 flex-grow">
              <div className="flex justify-around w-full items-center">
                <div className="flex flex-col items-center gap-2">
                    <User className="h-10 w-10 text-primary" />
                    <AttackRing progress={playerAttackProgress * 100} size={140} />
                    <p className="font-bold text-lg">{player.name}</p>
                </div>
                <Swords className="h-12 w-12 text-muted-foreground" />
                <div className="flex flex-col items-center gap-2">
                    <Bot className="h-10 w-10 text-red-400" />
                    <AttackRing progress={enemyAttackProgress * 100} size={140} strokeColor="hsl(var(--destructive))" />
                    <p className="font-bold text-lg">{enemy.nom}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                  <Switch id="auto-attack-switch" checked={autoAttack} onCheckedChange={toggleAutoAttack} />
                  <Label htmlFor="auto-attack-switch" className="flex items-center gap-2">
                      <Bot />
                      Attaque automatique
                  </Label>
              </div>
            </div>

            {/* Combat Log */}
            <div className="flex-grow min-h-0">
                <CombatLog log={combatLog} />
            </div>
        </div>
      </div>
      
       <ActionStrip 
          onSkill1={handleAttack}
          onPotion={() => console.log('potion used')}
          onRetreat={flee}
          isSkill1Ready={playerAttackProgress >= 1}
          isSkill1Auto={autoAttack}
          skills={activeSkills}
       />
    </div>
  );
}
