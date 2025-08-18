
'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Coins, Sparkles, BookOpen } from 'lucide-react';
import type { Quete } from '@/lib/types';

function QuestCard({ quest, progress }: { quest: Quete; progress?: number }) {
  const isCompleted = progress === undefined;
  const progressPercent = isCompleted ? 100 : (progress / quest.requirements.killCount) * 100;

  return (
    <div className="border p-4 rounded-lg bg-card-foreground/5 space-y-2">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-primary">{quest.name}</h3>
        {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>
      <p className="text-sm text-muted-foreground">{quest.desc}</p>
      {!isCompleted && (
         <div className="space-y-1 pt-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progrès</span>
                <span>{progress} / {quest.requirements.killCount}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
         </div>
      )}
      <div className="flex items-center gap-4 text-xs pt-2">
         <span className="flex items-center gap-1 text-yellow-400"><Coins className="h-3 w-3" /> {quest.rewards.gold}</span>
         <span className="flex items-center gap-1 text-blue-400"><Sparkles className="h-3 w-3" /> {quest.rewards.xp} XP</span>
         {quest.rewards.reputation && (
              <span className="flex items-center gap-1 text-purple-400"><BookOpen className="h-3 w-3" /> {quest.rewards.reputation.amount} Rép.</span>
         )}
      </div>
    </div>
  );
}

export function QuestsView() {
  const { activeQuests, player, gameData } = useGameStore((state) => ({
    activeQuests: state.activeQuests,
    player: state.player,
    gameData: state.gameData
  }));
  
  const completedQuests = gameData.quests.filter(q => player.completedQuests.includes(q.id));

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Journal de Quêtes</CardTitle>
        <CardDescription>Suivez vos aventures et les tâches à accomplir.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
         <Tabs defaultValue="active" className="w-full flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-6">
                <TabsTrigger value="active">Actives ({activeQuests.length})</TabsTrigger>
                <TabsTrigger value="completed">Terminées ({completedQuests.length})</TabsTrigger>
            </TabsList>
             <div className="relative flex-grow mt-4">
                 <ScrollArea className="absolute inset-0">
                    <div className="px-6 space-y-4">
                        <TabsContent value="active" className="m-0">
                            {activeQuests.length > 0 ? (
                                <div className="space-y-4">
                                {activeQuests.map(({ quete, progress }) => (
                                    <QuestCard key={quete.id} quest={quete} progress={progress} />
                                ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground p-8">Aucune quête active pour le moment.</p>
                            )}
                        </TabsContent>
                        <TabsContent value="completed" className="m-0">
                            {completedQuests.length > 0 ? (
                                 <div className="space-y-4">
                                {completedQuests.map((quete) => (
                                    <QuestCard key={quete.id} quest={quete} />
                                ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground p-8">Aucune quête terminée.</p>
                            )}
                        </TabsContent>
                    </div>
                </ScrollArea>
            </div>
         </Tabs>
      </CardContent>
    </Card>
  );
}
