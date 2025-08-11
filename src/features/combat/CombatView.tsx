'use client';

import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { AttackRing } from './components/AttackRing';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect } from 'react';
import { Dices, Heart, Shield, Bot, User, Swords, ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

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
    killCount
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
    killCount: state.combat.killCount
  }));

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
            {/* Arena / Actions */}
            <div className="flex flex-col items-center justify-center gap-4 border rounded-lg p-4">
              <div className="flex justify-around w-full items-center">
                <div className="flex flex-col items-center gap-2">
                    <User className="h-10 w-10 text-primary" />
                    <AttackRing progress={playerAttackProgress * 100} onFire={handleAttack} size={140} />
                    <p className="font-bold text-lg">{player.name}</p>
                </div>
                <Swords className="h-12 w-12 text-muted-foreground" />
                <div className="flex flex-col items-center gap-2">
                    <Bot className="h-10 w-10 text-red-400" />
                    <AttackRing progress={enemyAttackProgress * 100} onFire={() => {}} size={140} strokeColor="hsl(var(--destructive))" />
                    <p className="font-bold text-lg">{enemy.name}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4 w-full">
                <div className="flex items-center space-x-2">
                    <Switch id="auto-attack-switch" checked={autoAttack} onCheckedChange={toggleAutoAttack} />
                    <Label htmlFor="auto-attack-switch" className="flex items-center gap-2">
                        <Bot />
                        Attaque automatique
                    </Label>
                </div>
                <div className="flex w-full justify-center gap-4">
                    <Button onClick={handleAttack} disabled={playerAttackProgress < 1 || autoAttack} className="w-32">
                        <Dices className="mr-2 h-4 w-4" /> Attaquer
                    </Button>
                    <Button variant="secondary" className="w-32">
                        <Heart className="mr-2 h-4 w-4" /> Potion
                    </Button>
                    <Button variant="outline" onClick={flee} className="w-32">
                        <Shield className="mr-2 h-4 w-4" /> Retraite
                    </Button>
                </div>
              </div>
            </div>

            {/* Combat Log */}
            <div className="flex-grow min-h-0">
                <CombatLog log={combatLog} />
            </div>
        </div>
      </div>
    </div>
  );
}
