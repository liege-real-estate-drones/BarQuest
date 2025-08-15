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

  // Ensure reputation is an object before trying to get its keys
  const reputationEntries = reputation ? Object.entries(reputation) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reputationEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reputation yet.</p>
        ) : (
          reputationEntries.map(([factionId, value]) => (
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
