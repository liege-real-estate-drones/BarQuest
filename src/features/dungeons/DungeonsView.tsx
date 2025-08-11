'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';

export function DungeonsView() {
  const { dungeons, enterDungeon } = useGameStore(state => ({
    dungeons: state.gameData.dungeons,
    enterDungeon: state.enterDungeon
  }));

  return (
    <div className="p-4">
      <h2 className="text-2xl font-headline mb-4">Select a Dungeon</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dungeons.map(dungeon => (
          <Card key={dungeon.id}>
            <CardHeader>
              <CardTitle>{dungeon.name}</CardTitle>
              <CardDescription>Recommended Level: {dungeon.recommendedLevel}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Biome: <span className="capitalize text-primary">{dungeon.biome}</span></p>
              <p>Objective: Kill {dungeon.killTarget} monsters.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => enterDungeon(dungeon.id)}>Enter Dungeon</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
