'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlayerState } from '@/state/gameStore';
import { Monster } from '@/lib/types';
import * as formulas from '@/core/formulas';

interface EntityDisplayProps {
  entity: PlayerState | Monster;
  isPlayer?: boolean;
}

export default function EntityDisplay({ entity, isPlayer = false }: EntityDisplayProps) {
  const { level, name } = entity;
  const currentHp = isPlayer ? (entity as PlayerState).resources.hp : (entity as Monster).stats.hp;
  const maxHp = isPlayer ? formulas.calculateMaxHP(level, (entity as PlayerState).stats) : (entity as Monster).stats.hp;
  const hpPercentage = (currentHp / maxHp) * 100;

  let currentMana: number | undefined;
  let maxMana: number | undefined;
  let manaPercentage: number | undefined;

  if (isPlayer) {
    const player = entity as PlayerState;
    currentMana = player.resources.mana;
    maxMana = formulas.calculateMaxMana(level, player.stats);
    manaPercentage = (currentMana / maxMana) * 100;
  }
  
  const stats = isPlayer ? (entity as PlayerState).stats : (entity as Monster).stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex justify-between items-baseline">
          <span>{name}</span>
          <span className="text-sm text-muted-foreground">Lvl {level}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1 text-red-400">
            <span>HP</span>
            <span>{Math.round(currentHp)} / {Math.round(maxHp)}</span>
          </div>
          <Progress value={hpPercentage} className="h-4" indicatorClassName="bg-red-500" />
        </div>
        {isPlayer && maxMana !== undefined && (
          <div>
            <div className="flex justify-between text-xs mb-1 text-blue-400">
              <span>MANA</span>
              <span>{currentMana} / {maxMana}</span>
            </div>
            <Progress value={manaPercentage} className="h-4" indicatorClassName="bg-blue-500" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm pt-4">
          <div className="font-bold">STR:</div><div>{stats.str ?? 0}</div>
          <div className="font-bold">INT:</div><div>{stats.int ?? 0}</div>
          <div className="font-bold">DEX:</div><div>{stats.dex ?? 0}</div>
          <div className="font-bold">SPI:</div><div>{stats.spi ?? 0}</div>
          <div className="font-bold">Armor:</div><div>{stats.armor ?? 0}</div>
        </div>
      </CardContent>
    </Card>
  );
}
