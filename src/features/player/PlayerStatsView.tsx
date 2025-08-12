'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import * as formulas from '@/core/formulas';
import { Progress } from '@/components/ui/progress';
import type { ResourceType } from '@/lib/types';

const resourceConfig: Record<ResourceType, { color: string; indicator: string }> = {
    Mana: { color: 'text-blue-400', indicator: 'bg-gradient-to-r from-blue-500 to-blue-700' },
    Rage: { color: 'text-orange-400', indicator: 'bg-gradient-to-r from-orange-500 to-orange-700' },
    'Énergie': { color: 'text-yellow-400', indicator: 'bg-gradient-to-r from-yellow-500 to-yellow-700' },
};

export function PlayerStatsView() {
    const { player, getXpToNextLevel } = useGameStore(state => ({
        player: state.player,
        getXpToNextLevel: state.getXpToNextLevel,
    }));
    
    const stats = player.stats;
    const maxHp = formulas.calculateMaxHP(player.level, stats);
    const hpPercentage = maxHp > 0 ? (stats.PV / maxHp) * 100 : 0;
    
    const { current, max, type } = player.resources;
    const resourcePercentage = max > 0 ? (current / max) * 100 : 0;
    
    const xpToNextLevel = getXpToNextLevel();
    const xpPercentage = xpToNextLevel > 0 ? (player.xp / xpToNextLevel) * 100 : 0;

    const currentResourceConfig = resourceConfig[type] || { color: 'text-gray-400', indicator: 'bg-gray-500' };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex justify-between items-baseline">
                    <span>{player.name}</span>
                    <span className="text-sm text-muted-foreground">Lvl {player.level}</span>
                </CardTitle>
                <CardDescription className="capitalize">{player.classeId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <div className="flex justify-between text-xs mb-1 font-mono text-red-400">
                        <span>PV</span>
                        <span>{Math.round(stats.PV)} / {Math.round(maxHp)}</span>
                    </div>
                    <Progress value={hpPercentage} className="h-4" indicatorClassName="bg-gradient-to-r from-red-500 to-red-700" />
                </div>
                 <div>
                    <div className={`flex justify-between text-xs mb-1 font-mono ${currentResourceConfig.color}`}>
                        <span>{type.toUpperCase()}</span>
                        <span>{Math.round(current)} / {Math.round(max)}</span>
                    </div>
                    <Progress value={resourcePercentage} className="h-4" indicatorClassName={currentResourceConfig.indicator} />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1 font-mono text-yellow-400">
                        <span>XP</span>
                        <span>{Math.round(player.xp)} / {Math.round(xpToNextLevel)}</span>
                    </div>
                    <Progress value={xpPercentage} className="h-2" indicatorClassName="bg-gradient-to-r from-yellow-400 to-yellow-600" />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-mono pt-4">
                    <span className="text-muted-foreground">Points de talent:</span><span className="text-right font-bold text-primary">{player.talentPoints}</span>
                    <hr className="col-span-2 my-1 border-border" />
                    <span className="text-muted-foreground">Force:</span><span className="text-right">{stats.Force ?? 0}</span>
                    <span className="text-muted-foreground">Intelligence:</span><span className="text-right">{stats.Intelligence ?? 0}</span>
                    <span className="text-muted-foreground">Dextérité:</span><span className="text-right">{stats.Dexterite ?? 0}</span>
                    <span className="text-muted-foreground">Esprit:</span><span className="text-right">{stats.Esprit ?? 0}</span>
                    <hr className="col-span-2 my-1 border-border" />
                    <span className="text-muted-foreground">Attaque:</span><span className="text-right">{stats.AttMin ?? 0} - {stats.AttMax ?? 0}</span>
                    <span className="text-muted-foreground">Crit %:</span><span className="text-right">{stats.CritPct ?? 0}%</span>
                    <span className="text-muted-foreground">Crit Dmg:</span><span className="text-right">{stats.CritDmg ?? 0}%</span>
                    <span className="text-muted-foreground">Armure:</span><span className="text-right">{stats.Armure ?? 0}</span>
                    <span className="text-muted-foreground">Vitesse:</span><span className="text-right">{stats.Vitesse ?? 0}s</span>
                </div>
            </CardContent>
        </Card>
    )
}
