'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttackRing } from './components/AttackRing';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect } from 'react';
import { Dices, Heart, Shield, Bot } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function CombatView() {
  const {
    player,
    enemy,
    attack,
    flee,
    attackProgress,
    startCombat,
    combatLog,
    autoAttack,
    toggleAutoAttack
  } = useGameStore((state) => ({
    player: state.player,
    enemy: state.combat.enemy,
    attack: state.attack,
    flee: state.flee,
    attackProgress: state.combat.attackProgress,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
    autoAttack: state.combat.autoAttack,
    toggleAutoAttack: state.toggleAutoAttack
  }));

  useEffect(() => {
    // Auto-start combat when view loads if no enemy
    if (!enemy) {
      startCombat();
    }
  }, [enemy, startCombat]);
  
  if (!enemy) {
    return <div className="flex items-center justify-center h-screen">Finding a target...</div>;
  }

  const handleAttack = () => {
    if (attackProgress >= 1) {
      attack();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col p-4 gap-4 font-code bg-background text-foreground">
      <header className="flex justify-between items-center border-b pb-2">
        <h1 className="text-2xl font-bold font-headline text-primary">BarQuest</h1>
        <div>Dungeon Name - Floor 1</div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
        {/* Player Panel */}
        <EntityDisplay entity={player} isPlayer />

        {/* Arena / Actions */}
        <div className="flex flex-col items-center justify-between gap-4">
          <div className="w-full text-center">
             <Card>
                <CardHeader>
                    <CardTitle className="text-primary">VS</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">{enemy.name}</p>
                    <p className="text-sm text-muted-foreground">Level {enemy.level} {enemy.family}</p>
                </CardContent>
             </Card>
          </div>
          <AttackRing progress={attackProgress * 100} onFire={handleAttack} />
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex items-center space-x-2">
                <Switch id="auto-attack-switch" checked={autoAttack} onCheckedChange={toggleAutoAttack} />
                <Label htmlFor="auto-attack-switch" className="flex items-center gap-2">
                    <Bot />
                    Attaque automatique
                </Label>
            </div>
            <div className="flex w-full justify-center gap-4">
                <Button onClick={handleAttack} disabled={attackProgress < 1 || autoAttack} className="w-32">
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

        {/* Enemy Panel */}
        <EntityDisplay entity={enemy} />
      </div>

       {/* Combat Log */}
      <div className="h-48">
         <CombatLog log={combatLog} />
      </div>
    </div>
  );
}
