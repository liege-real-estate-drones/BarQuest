'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/state/gameStore';
import { Monstre, Stats, PlayerState, ResourceType, CombatEnemy } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import React from 'react';
import { BuffsDisplay } from './BuffsDisplay';

interface EntityDisplayProps {
  entity: PlayerState | CombatEnemy;
  isPlayer?: boolean;
  isTarget?: boolean;
  isCompact?: boolean;
  attackProgress?: number;
  dungeonInfo?: React.ReactNode;
}

function StatGrid({ stats }: { stats: Stats }) {
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            <span className="text-muted-foreground">Attaque:</span><span className="text-right">{stats.AttMin ?? 0} - {stats.AttMax ?? 0}</span>
            <span className="text-muted-foreground">Crit %:</span><span className="text-right">{stats.CritPct ?? 0}%</span>
            <span className="text-muted-foreground">Crit Dmg:</span><span className="text-right">{stats.CritDmg ?? 0}%</span>
            <span className="text-muted-foreground">Armure:</span><span className="text-right">{stats.Armure ?? 0}</span>
            <span className="text-muted-foreground">Vitesse:</span><span className="text-right">{stats.Vitesse ?? 0}s</span>
        </div>
    );
}

const resourceConfig: Record<ResourceType, { color: string; indicator: string }> = {
    Mana: { color: 'text-blue-400', indicator: 'bg-gradient-to-r from-blue-500 to-blue-700' },
    Rage: { color: 'text-orange-400', indicator: 'bg-gradient-to-r from-orange-500 to-orange-700' },
    'Énergie': { color: 'text-yellow-400', indicator: 'bg-gradient-to-r from-yellow-500 to-yellow-700' },
};

export default function EntityDisplay({ entity, isPlayer = false, isTarget = false, isCompact = false, attackProgress: attackProgressProp, dungeonInfo }: EntityDisplayProps) {
  const getXpToNextLevel = useGameStore(s => s.getXpToNextLevel);
  const [showStats, setShowStats] = React.useState(isPlayer); // Stats affichées par défaut pour le joueur

  const { level } = entity;
  const name = isPlayer ? (entity as PlayerState).name : (entity as Monstre).nom;

  const currentHp = entity.stats.PV;
  const maxHp = isPlayer 
    ? formulas.calculateMaxHP(entity.level, (entity as PlayerState).stats) 
    : (entity as CombatEnemy).initialHp ?? entity.stats.PV;

  const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  let xpPercentage, xpToNextLevel;

  if (isPlayer) {
    const player = entity as PlayerState;
    xpToNextLevel = getXpToNextLevel();
    xpPercentage = xpToNextLevel > 0 ? (player.xp / xpToNextLevel) * 100 : 0;
  }
  
  const stats = entity.stats;
  const playerResources = isPlayer ? (entity as PlayerState).resources : undefined;
  const currentResourceConfig = (playerResources?.type && resourceConfig[playerResources.type]) || { color: 'text-gray-400', indicator: 'bg-gray-500' };

  const handleCardClick = () => {
    if (!isCompact || isPlayer) {
        setShowStats(!showStats);
    }
  }

  const buffs = (entity as PlayerState).activeBuffs || (entity as CombatEnemy).activeBuffs || [];
  const debuffs = (entity as PlayerState).activeDebuffs || (entity as CombatEnemy).activeDebuffs || [];


  return (
    <Card 
        className={cn("flex flex-col bg-card/50 transition-all border-2 border-transparent",
            isPlayer && "border-green-500/30",
            isTarget && "border-primary shadow-lg shadow-primary/20",
            (!isCompact || isPlayer) && "cursor-pointer",
            (entity as CombatEnemy).isBoss && "border-destructive shadow-lg shadow-destructive/40"
        )}
        onClick={handleCardClick}
    >
      <CardHeader className={cn("flex-shrink-0 space-y-1", isCompact ? "p-2" : "p-3")}>
        <CardTitle className={cn("font-headline flex justify-between items-center", isCompact ? "text-sm" : "text-base")}>
            <div className="flex-grow min-w-0 mr-2">
                <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{name}</span>
                    {isTarget && <span className="text-xs text-primary font-normal">(Cible)</span>}
                </div>
                <Progress value={((isPlayer ? attackProgressProp : (entity as CombatEnemy).attackProgress) || 0) * 100} className={cn("h-1 bg-background/50 mt-1", isCompact ? "w-12" : "w-20")} indicatorClassName="bg-yellow-500" />
            </div>
            {isPlayer && dungeonInfo && <div className="flex-shrink-0">{dungeonInfo}</div>}
            {!isPlayer && <span className={cn("text-muted-foreground flex-shrink-0", isCompact ? "text-xs" : "text-sm")}>Lvl {level}</span>}
        </CardTitle>
        <CardDescription className="capitalize text-xs">
          {isPlayer ? (entity as PlayerState).classeId : (entity as Monstre).famille}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-1.5 flex-grow pt-0", isCompact ? "p-2" : "p-3")}>
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono text-red-400">
            <span>PV</span>
            <span>{Math.round(currentHp)}/{Math.round(maxHp)}</span>
          </div>
          <Progress value={hpPercentage} className="h-2.5" indicatorClassName="bg-gradient-to-r from-red-500 to-red-700" />
        </div>
        {isPlayer && playerResources && playerResources.type && playerResources.max > 0 && (
          <div>
            <div className={`flex justify-between text-xs mb-1 font-mono ${currentResourceConfig.color}`}>
              <span>{playerResources.type.toUpperCase()}</span>
              <span>{Math.round(playerResources.current)}/{Math.round(playerResources.max)}</span>
            </div>
            <Progress value={(playerResources.current / playerResources.max) * 100} className="h-2.5" indicatorClassName={currentResourceConfig.indicator} />
          </div>
        )}
        {isPlayer && xpToNextLevel !== undefined && (
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono text-yellow-400">
                <span>XP</span>
                <span>{Math.round((entity as PlayerState).xp)}/{Math.round(xpToNextLevel)}</span>
            </div>
            <Progress value={xpPercentage} className="h-1.5" indicatorClassName="bg-gradient-to-r from-yellow-400 to-yellow-600" />
          </div>
        )}
        
        <BuffsDisplay buffs={buffs} debuffs={debuffs} />

        {showStats && (
            <>
                <Separator className="my-2" />
                <StatGrid stats={stats} />
            </>
        )}
      </CardContent>
    </Card>
  );
}
