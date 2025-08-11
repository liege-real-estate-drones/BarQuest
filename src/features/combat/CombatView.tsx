'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AttackRing } from './components/AttackRing';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useEffect } from 'react';
import { Dices, Heart, Shield } from 'lucide-react';

export function CombatView() {
  const {
    player,
    enemy,
    attack,
    flee,
    attackProgress,
    startCombat,
    combatLog,
  } = useGameStore((state) => ({
    player: state.player,
    enemy: state.combat.enemy,
    attack: state.attack,
    flee: state.flee,
    attackProgress: state.combat.attackProgress,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
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
          <div className="flex w-full justify-center gap-4">
            <Button onClick={handleAttack} disabled={attackProgress < 1} className="w-32">
                <Dices className="mr-2 h-4 w-4" /> Attack
            </Button>
            <Button variant="secondary" className="w-32">
                <Heart className="mr-2 h-4 w-4" /> Potion
            </Button>
            <Button variant="outline" onClick={flee} className="w-32">
                <Shield className="mr-2 h-4 w-4" /> Retreat
            </Button>
          </div>
        </div>

        {/* Combat Log */}
        <CombatLog log={combatLog} />
      </div>
    </div>
  );
}
