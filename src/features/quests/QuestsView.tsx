'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function QuestsView() {
  const { activeQuests } = useGameStore((state) => ({
    activeQuests: state.activeQuests,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeQuests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active quests.</p>
        ) : (
          activeQuests.map(({ quete, progress }) => (
            <div key={quete.id}>
              <h3 className="font-semibold">{quete.name}</h3>
              <p className="text-sm text-muted-foreground">{quete.desc}</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={(progress / quete.requirements.killCount) * 100} className="w-full" />
                <span className="text-xs text-muted-foreground">
                  {progress}/{quete.requirements.killCount}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
