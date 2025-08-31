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
  
  import { Switch } from "@/components/ui/switch";
  import { Label } from "@/components/ui/label";
  
  export function DungeonsView() {
      const { dungeons, enterDungeon, player, gameData, proposedQuests, setProposedQuests, acceptMultipleQuests, activeQuests, isHeroicMode, setHeroicMode } = useGameStore(state => ({
          dungeons: state.gameData.dungeons,
          enterDungeon: state.enterDungeon,
          player: state.player,
          gameData: state.gameData,
          proposedQuests: state.proposedQuests,
          setProposedQuests: state.setProposedQuests,
          acceptMultipleQuests: state.acceptMultipleQuests,
          activeQuests: state.activeQuests,
          isHeroicMode: state.isHeroicMode,
          setHeroicMode: state.setHeroicMode,
      }));
  
      const completedDungeons = player.completedDungeons || {};
  
      const handleEnterDungeon = (dungeon: Dungeon) => {
          const dungeonIdToEnter = isHeroicMode ? dungeon.heroicVersionId : dungeon.id;
          if (!dungeonIdToEnter) return;
  
          const availableQuestsForDungeon = gameData.quests.filter(q =>
              q.requirements.dungeonId === dungeonIdToEnter &&
              !player.completedQuests.includes(q.id) &&
              !activeQuests.some((aq: ActiveQuete) => aq.quete.id === q.id) &&
              (!q.requirements.classId || q.requirements.classId === player.classeId)
          );
  
          const allAvailableQuests = availableQuestsForDungeon.filter(q => {
              const questIdParts = q.id.split('_q');
              if (questIdParts.length < 2 || isNaN(parseInt(questIdParts[1], 10))) {
                  if (q.id.includes('_q_boss')) {
                      const questPrefix = q.id.substring(0, q.id.indexOf('_q_boss'));
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
              enterDungeon(dungeonIdToEnter);
          }
      }
  
      const handleAcceptQuestAndEnter = () => {
          if (proposedQuests && proposedQuests.length > 0) {
              const questIds = proposedQuests.map(q => q.id);
              acceptMultipleQuests(questIds);
              const dungeonIdToEnter = proposedQuests[0].requirements.dungeonId;
              if (dungeonIdToEnter) {
                  enterDungeon(dungeonIdToEnter);
              }
              setProposedQuests(null);
          }
      };
  
      const handleDeclineQuestAndEnter = () => {
          if (proposedQuests && proposedQuests.length > 0) {
              const dungeonIdToEnter = proposedQuests[0].requirements.dungeonId;
              if (dungeonIdToEnter) {
                  enterDungeon(dungeonIdToEnter);
              }
              setProposedQuests(null);
          }
      };
  
      // Display only normal dungeons
      const displayedDungeons = dungeons.filter(dungeon => !dungeons.some(d => d.heroicVersionId === dungeon.id));
  
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
                  <div className="p-4">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="text-2xl font-headline">Sélectionnez un Donjon</h2>
                          <div className="flex items-center space-x-2">
                              <Label htmlFor="heroic-mode">Mode Héroïque</Label>
                              <Switch id="heroic-mode" checked={isHeroicMode} onCheckedChange={setHeroicMode} />
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {displayedDungeons.map((dungeon: Dungeon, index: number) => {
                              const heroicDungeon = dungeon.heroicVersionId ? dungeons.find(d => d.id === dungeon.heroicVersionId) : null;
                              const dungeonToDisplay = isHeroicMode && heroicDungeon ? heroicDungeon : dungeon;
  
                              const completionCount = completedDungeons[dungeonToDisplay.id] || 0;
                              const isCompleted = completionCount > 0;
  
                              let isUnlocked = index === 0 || (completedDungeons[displayedDungeons[index - 1]?.id] || 0) > 0;
                              if (isHeroicMode) {
                                  isUnlocked = (completedDungeons[dungeon.id] || 0) > 0;
                              }
  
                              const activeQuestsForDungeon = activeQuests.filter(q => q.quete.requirements.dungeonId === dungeonToDisplay.id).length;
  
  
                              const dungeonIndex = parseInt(dungeon.id.split('_')[1]);
                              const cardStyle = {
                                  backgroundImage: `url('/images/biome${dungeonIndex}.png')`,
                                  backgroundSize: 'contain',
                                  backgroundPosition: 'center',
                                  backgroundRepeat: 'no-repeat',
                              };
  
                              return (
                                  <Card
                                      key={dungeon.id}
                                      className={`transition-all relative overflow-hidden bg-transparent text-white ${!isUnlocked ? 'filter grayscale' : ''}`}
                                      style={cardStyle}
                                  >
                                      <div className="absolute inset-0 bg-black/50 z-0" />
                                      <div className="relative z-10 flex flex-col h-full">
                                          <CardHeader>
                                              <CardTitle className="flex justify-between items-center">
                                                  {dungeonToDisplay.name}
                                                  {activeQuestsForDungeon > 0 && (
                                                      <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                                                          {activeQuestsForDungeon} quête(s)
                                                      </span>
                                                  )}
                                              </CardTitle>
                                              <CardDescription className="text-gray-300">
                                                  Palier: {dungeonToDisplay.palier}
                                                  {isCompleted && <span className="text-primary font-bold ml-2"> (Terminé {completionCount}x)</span>}
                                              </CardDescription>
                                          </CardHeader>
                                          <CardContent className="flex-grow">
                                              <p>Biome: <span className="capitalize text-primary">{dungeonToDisplay.biome}</span></p>
                                              <p>Objectif: Tuer {dungeonToDisplay.killTarget} monstres.</p>
                                          </CardContent>
                                          <CardFooter>
                                              <Button onClick={() => handleEnterDungeon(dungeon)} disabled={!isUnlocked}>
                                                  {isCompleted ? "Rejouer" : "Entrer"}
                                              </Button>
                                          </CardFooter>
                                      </div>
                                  </Card>
                              );
                          })}
                      </div>
                  </div>
              </ScrollArea>
  
              <AlertDialog open={!!proposedQuests && proposedQuests.length > 0} onOpenChange={() => setProposedQuests(null)}>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Quêtes Disponibles!</AlertDialogTitle>
                          <AlertDialogDescription>
                              Les quêtes suivantes sont disponibles pour ce donjon. Voulez-vous toutes les accepter avant d&apos;entrer ?
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-4">
                          <ul className="list-disc pl-5 space-y-1">
                              {proposedQuests?.map(q => <li key={q.id}>{q.name}</li>)}
                          </ul>
                      </div>
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