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
import { Dungeon, Quete } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActiveQuete } from "@/state/gameStore";

export function DungeonsView() {
  const { dungeons, enterDungeon, player, gameData, proposedQuests, setProposedQuests, acceptMultipleQuests, activeQuests } = useGameStore(state => ({
    dungeons: state.gameData.dungeons,
    enterDungeon: state.enterDungeon,
    player: state.player,
    gameData: state.gameData,
    proposedQuests: state.proposedQuests,
    setProposedQuests: state.setProposedQuests,
    acceptMultipleQuests: state.acceptMultipleQuests,
    activeQuests: state.activeQuests,
  }));

  const completedDungeons = player.completedDungeons || {};

  const handleEnterDungeon = (dungeonId: string) => {
      const availableQuestsForDungeon = gameData.quests.filter(q =>
          q.requirements.dungeonId === dungeonId &&
          !player.completedQuests.includes(q.id) &&
          !activeQuests.some((aq: ActiveQuete) => aq.quete.id === q.id) &&
          (!q.requirements.classId || q.requirements.classId === player.classeId)
      );

      const allAvailableQuests = availableQuestsForDungeon.filter(q => {
          const questIdParts = q.id.split('_q');
          if (questIdParts.length < 2 || isNaN(parseInt(questIdParts[1], 10))) {
              // Pour les quêtes non-numérotées comme _q_boss
              if (q.id.includes('_q_boss')) {
                  const questPrefix = q.id.substring(0, q.id.indexOf('_q_boss'));
                  // S'assurer que la dernière quête numérotée (q5) est terminée
                  const lastNumberedQuestId = `${questPrefix}_q5`;
                  return player.completedQuests.includes(lastNumberedQuestId);
              }
              return true;
          }
          const questNum = parseInt(questIdParts[1], 10);
          if (questNum === 1) return true;
          const questPrefix = questIdParts[0];
          const prevQuestId = `${questPrefix}_q${questNum - 1}`;
          return player.completedQuests.includes(prevQuestId);
      });


      if (allAvailableQuests.length > 0) {
          setProposedQuests(allAvailableQuests);
      } else {
          enterDungeon(dungeonId);
      }
  }

  const handleAcceptQuestAndEnter = () => {
    if (proposedQuests && proposedQuests.length > 0) {
      const questIds = proposedQuests.map(q => q.id);
      acceptMultipleQuests(questIds);
      const dungeonId = proposedQuests[0].requirements.dungeonId;
      if (dungeonId) {
          enterDungeon(dungeonId);
      }
      setProposedQuests(null);
    }
  };

  const handleDeclineQuestAndEnter = () => {
    if (proposedQuests && proposedQuests.length > 0) {
        const dungeonId = proposedQuests[0].requirements.dungeonId;
        if (dungeonId) {
            enterDungeon(dungeonId);
        }
        setProposedQuests(null);
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
      
      <AlertDialog open={!!proposedQuests && proposedQuests.length > 0} onOpenChange={() => setProposedQuests(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quêtes Disponibles!</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-4">Les quêtes suivantes sont disponibles pour ce donjon. Voulez-vous toutes les accepter avant d'entrer ?</p>
                <ul className="list-disc pl-5 space-y-1">
                  {proposedQuests?.map(q => <li key={q.id}>{q.name}</li>)}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProposedQuests(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeclineQuestAndEnter}>Entrer sans accepter</AlertDialogAction>
            <AlertDialogAction onClick={handleAcceptQuestAndEnter}>Tout accepter et Entrer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}