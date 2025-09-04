
'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function ReputationView() {
  const { getActiveHero, factions } = useGameStore((state) => ({
    getActiveHero: state.getActiveHero,
    factions: state.gameData.factions,
  }));

  const activeHero = getActiveHero();

  if (!activeHero || !activeHero.player.reputation || Object.keys(activeHero.player.reputation).length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Reputation</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Aucune réputation acquise pour le moment.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(activeHero.player.reputation).map(([factionId, repData]) => {
          const faction = factions.find(f => f.id === factionId);
          if (!faction) return null;

          const currentRankIndex = faction.ranks.findLastIndex(r => repData.value >= r.threshold);
          const currentRank = faction.ranks[currentRankIndex];
          const nextRank = faction.ranks[currentRankIndex + 1];

          const progressPercent = nextRank 
            ? ((repData.value - currentRank.threshold) / (nextRank.threshold - currentRank.threshold)) * 100 
            : 100;
          
          return (
            <div key={factionId}>
              <div className="flex justify-between items-baseline mb-1">
                <h4 className="font-semibold">{faction.name}</h4>
                <span className="text-sm text-primary">{currentRank.name}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex justify-between items-baseline text-xs text-muted-foreground mt-1">
                <span>{repData.value}</span>
                <span>{nextRank ? nextRank.threshold : 'Max'}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
