'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReputationView() {
  const { reputation, factions } = useGameStore((state) => ({
    reputation: state.player.reputation,
    factions: state.gameData.factions,
  }));

  const getFactionName = (factionId: string) => {
    return factions.find(f => f.id === factionId)?.name || factionId;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.keys(reputation).length === 0 ? (
          <p className="text-sm text-muted-foreground">No reputation yet.</p>
        ) : (
          Object.entries(reputation).map(([factionId, value]) => (
            <div key={factionId} className="flex justify-between items-center">
                <span className="font-medium">{getFactionName(factionId)}</span>
                <span className="text-muted-foreground">{value}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
