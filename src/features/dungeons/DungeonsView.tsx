// Dans DungeonsView.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGameStore } from '@/state/gameStore';
import { Dungeon } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function DungeonsView() {
  const { dungeons, enterDungeon, player, gameData, proposedQuest, setProposedQuest, acceptQuest } = useGameStore(state => ({
    dungeons: state.gameData.dungeons,
    enterDungeon: state.enterDungeon,
    player: state.player,
    gameData: state.gameData,
    proposedQuest: state.proposedQuest,
    setProposedQuest: state.setProposedQuest,
    acceptQuest: state.acceptQuest,
  }));

  const completedDungeons = player.completedDungeons || {};

  const handleEnterDungeon = (dungeonId: string) => {
      enterDungeon(dungeonId);
  }

  const handleAcceptQuestAndEnter = () => {
    if (proposedQuest) {
      acceptQuest(proposedQuest.id);
      handleEnterDungeon(proposedQuest.requirements.dungeonId);
      setProposedQuest(null);
    }
  };

  const handleDeclineQuestAndEnter = () => {
    if (proposedQuest) {
      handleEnterDungeon(proposedQuest.requirements.dungeonId);
      setProposedQuest(null);
    }
  };

  if (!Array.isArray(dungeons)) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Erreur lors du chargement des donjons...</p>
        </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full w-full">
        <div className="p-1">
          <h2 className="text-2xl font-headline mb-4">Sélectionnez un Donjon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dungeons.map((dungeon: Dungeon, index: number) => {
              const completionCount = completedDungeons[dungeon.id] || 0;
              const isCompleted = completionCount > 0;
              const isUnlocked = index === 0 || (completedDungeons[gameData.dungeons[index - 1]?.id] || 0) > 0;

              return (
                  <Card key={dungeon.id} className={`transition-all ${!isUnlocked ? 'bg-background/40 filter grayscale' : ''}`}>
                    <CardHeader>
                        <CardTitle>{dungeon.name}</CardTitle>
                        <CardDescription>
                          Palier: {dungeon.palier} 
                          {isCompleted && <span className="text-primary font-bold ml-2"> (Terminé {completionCount}x)</span>}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Biome: <span className="capitalize text-primary">{dungeon.biome}</span></p>
                        <p>Objectif: Tuer {dungeon.killTarget} monstres.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => handleEnterDungeon(dungeon.id)} disabled={!isUnlocked}>
                        {isCompleted ? "Rejouer" : "Entrer"}
                        </Button>
                    </CardFooter>
                  </Card>
              )
          })}
          </div>
        </div>
      </ScrollArea>
      
      <AlertDialog open={!!proposedQuest} onOpenChange={() => setProposedQuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quête Disponible!</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez une quête disponible pour ce donjon: "{proposedQuest?.name}". Voulez-vous l'accepter avant d'entrer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProposedQuest(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeclineQuestAndEnter}>Entrer sans accepter</AlertDialogAction>
            <AlertDialogAction onClick={handleAcceptQuestAndEnter}>Accepter et Entrer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}