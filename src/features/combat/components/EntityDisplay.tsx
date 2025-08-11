'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlayerState, useGameStore } from '@/state/gameStore';
import { Monstre } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { Separator } from '@/components/ui/separator';

interface EntityDisplayProps {
  entity: PlayerState | Monstre;
  isPlayer?: boolean;
}

export default function EntityDisplay({ entity, isPlayer = false }: EntityDisplayProps) {
  const { level, name } = entity;
  const getXpToNextLevel = useGameStore(s => s.getXpToNextLevel);
  
  const currentHp = entity.stats.PV;
  const maxHp = isPlayer 
    ? formulas.calculateMaxHP(entity as PlayerState) 
    : (entity as any).initialHp ?? entity.stats.PV;

  const hpPercentage = (currentHp / maxHp) * 100;

  let currentMana: number | undefined;
  let maxMana: number | undefined;
  let manaPercentage: number | undefined;
  let xpPercentage: number | undefined;
  let xpToNextLevel: number | undefined;

  if (isPlayer) {
    const player = entity as PlayerState;
    currentMana = player.resources.mana;
    maxMana = formulas.calculateMaxMana(player);
    manaPercentage = maxMana > 0 ? (currentMana / maxMana) * 100 : 0;
    
    xpToNextLevel = getXpToNextLevel();
    xpPercentage = (player.xp / xpToNextLevel) * 100;
  }
  
  const stats = entity.stats;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="font-headline flex justify-between items-baseline">
          <span>{name}</span>
          <span className="text-sm text-muted-foreground">Lvl {level}</span>
        </CardTitle>
        {isPlayer && <CardDescription>The Hero</CardDescription>}
        {!isPlayer && <CardDescription className="capitalize">{(entity as Monstre).famille}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono text-red-400">
            <span>PV</span>
            <span>{Math.round(currentHp)} / {Math.round(maxHp)}</span>
          </div>
          <Progress value={hpPercentage} className="h-4" indicatorClassName="bg-gradient-to-r from-red-500 to-red-700" />
        </div>
        {isPlayer && maxMana !== undefined && maxMana > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono text-blue-400">
              <span>MANA</span>
              <span>{Math.round(currentMana!)} / {Math.round(maxMana)}</span>
            </div>
            <Progress value={manaPercentage} className="h-4" indicatorClassName="bg-gradient-to-r from-blue-500 to-blue-700" />
          </div>
        )}
        {isPlayer && xpToNextLevel !== undefined && (
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono text-yellow-400">
                <span>XP</span>
                <span>{Math.round((entity as PlayerState).xp)} / {Math.round(xpToNextLevel)}</span>
            </div>
            <Progress value={xpPercentage} className="h-2" indicatorClassName="bg-gradient-to-r from-yellow-500 to-yellow-700" />
          </div>
        )}
        <Separator className="my-4" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-mono">
            <span className="text-muted-foreground">Attaque:</span><span className="text-right">{stats.AttMin ?? 0} - {stats.AttMax ?? 0}</span>
            <span className="text-muted-foreground">Crit %:</span><span className="text-right">{stats.CritPct ?? 0}%</span>
            <span className="text-muted-foreground">Crit Dmg:</span><span className="text-right">{stats.CritDmg ?? 0}%</span>
            <span className="text-muted-foreground">Armure:</span><span className="text-right">{stats.Armure ?? 0}</span>
            <span className="text-muted-foreground">Vitesse:</span><span className="text-right">{stats.Vitesse ?? 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}
