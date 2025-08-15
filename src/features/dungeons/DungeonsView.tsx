
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';

export function DungeonsView() {
  const { dungeons, enterDungeon, completedDungeons } = useGameStore(state => ({
    dungeons: state.gameData.dungeons,
    enterDungeon: state.enterDungeon,
    completedDungeons: state.player.completedDungeons || [],
  }));

  const unlockedDungeons = dungeons.filter((dungeon, index) => {
    if (index === 0) return true; // First dungeon is always unlocked
    const previousDungeon = dungeons[index - 1];
    return completedDungeons.includes(previousDungeon.id);
  });


  return (
    <div className="p-4">
      <h2 className="text-2xl font-headline mb-4">Select a Dungeon</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dungeons.map(dungeon => {
          const isUnlocked = unlockedDungeons.some(unlocked => unlocked.id === dungeon.id);
          const isCompleted = completedDungeons.includes(dungeon.id);

          return (
             <Card key={dungeon.id} className={`transition-all ${!isUnlocked ? 'bg-background/40 filter grayscale' : ''}`}>
                <CardHeader>
                  <CardTitle>{dungeon.name}</CardTitle>
                  <CardDescription>Palier: {dungeon.palier} {isCompleted && <span className="text-primary font-bold ml-2"> (Terminé)</span>}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Biome: <span className="capitalize text-primary">{dungeon.biome}</span></p>
                  <p>Objectif: Tuer {dungeon.killTarget} monstres.</p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => enterDungeon(dungeon.id)} disabled={!isUnlocked}>
                    {isCompleted ? "Rejouer" : "Entrer"}
                  </Button>
                </CardFooter>
              </Card>
          )
        })}
      </div>
    </div>
  );
}
