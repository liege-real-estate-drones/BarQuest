'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGameStore } from '@/state/gameStore';
import { Monstre, Stats, PlayerState, ResourceType } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { Separator } from '@/components/ui/separator';

interface EntityDisplayProps {
  entity: PlayerState | Monstre;
  isPlayer?: boolean;
}

function StatGrid({ stats }: { stats: Stats }) {
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-mono">
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

export default function EntityDisplay({ entity, isPlayer = false }: EntityDisplayProps) {
  const getXpToNextLevel = useGameStore(s => s.getXpToNextLevel);
  
  const { level } = entity;
  const name = isPlayer ? (entity as PlayerState).name : (entity as Monstre).nom;

  const currentHp = entity.stats.PV;
  const maxHp = isPlayer 
    ? formulas.calculateMaxHP(entity.level, (entity as PlayerState).stats) 
    : (entity as any).initialHp ?? entity.stats.PV;

  const hpPercentage = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  let playerResources, xpPercentage, xpToNextLevel, currentResourceConfig;

  if (isPlayer) {
    const player = entity as PlayerState;
    playerResources = player.resources;
    xpToNextLevel = getXpToNextLevel();
    xpPercentage = xpToNextLevel > 0 ? (player.xp / xpToNextLevel) * 100 : 0;
    currentResourceConfig = resourceConfig[playerResources.type] || { color: 'text-gray-400', indicator: 'bg-gray-500' };
  }
  
  const stats = entity.stats;

  return (
    <Card className="flex flex-col h-full bg-card/50">
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
        {isPlayer && playerResources && playerResources.max > 0 && currentResourceConfig && (
          <div>
            <div className={`flex justify-between text-xs mb-1 font-mono ${currentResourceConfig.color}`}>
              <span>{playerResources.type.toUpperCase()}</span>
              <span>{Math.round(playerResources.current)} / {Math.round(playerResources.max)}</span>
            </div>
            <Progress value={(playerResources.current / playerResources.max) * 100} className="h-4" indicatorClassName={currentResourceConfig.indicator} />
          </div>
        )}
        {isPlayer && xpToNextLevel !== undefined && (
          <div>
            <div className="flex justify-between text-xs mb-1 font-mono text-yellow-400">
                <span>XP</span>
                <span>{Math.round((entity as PlayerState).xp)} / {Math.round(xpToNextLevel)}</span>
            </div>
            <Progress value={xpPercentage} className="h-2" indicatorClassName="bg-gradient-to-r from-yellow-400 to-yellow-600" />
          </div>
        )}
        <Separator className="my-4" />
        <StatGrid stats={stats} />
      </CardContent>
    </Card>
  );
}
