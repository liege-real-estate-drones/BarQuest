'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGameStore } from '@/state/gameStore';
import { PlusCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function TalentsView() {
    const { player, gameData, learnTalent, talentPoints } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        learnTalent: state.learnTalent,
        talentPoints: state.player.talentPoints
    }));

    const playerTalents = gameData.talents.filter(t => t.classeId === player.classeId);

    const canLearnTalent = (talentId: string): boolean => {
        if (talentPoints <= 0) return false;
        
        const talent = playerTalents.find(t => t.id === talentId);
        if (!talent) return false;

        const currentRank = player.talents[talentId] || 0;
        if (currentRank >= talent.rangMax) return false;

        if (talent.exigences.length === 0) return true;

        return talent.exigences.every(req => {
            const [reqId, reqRankStr] = req.split(':');
            const reqRank = parseInt(reqRankStr, 10);
            return (player.talents[reqId] || 0) >= reqRank;
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Talents</span>
                    <span className="text-sm font-medium text-primary">{talentPoints} points restants</span>
                </CardTitle>
                <CardDescription>Dépensez vos points pour améliorer votre personnage.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-full pr-4">
                    <TooltipProvider delayDuration={100}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playerTalents.map(talent => {
                                const currentRank = player.talents[talent.id] || 0;
                                const isMaxRank = currentRank >= talent.rangMax;
                                const canLearn = canLearnTalent(talent.id);

                                return (
                                    <Tooltip key={talent.id} >
                                        <TooltipTrigger asChild>
                                            <div className={`border rounded-lg p-3 flex justify-between items-center transition-all ${!canLearn && !isMaxRank ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <div>
                                                    <p className="font-semibold">{talent.nom}</p>
                                                    <p className="text-xs text-muted-foreground">Rang {currentRank}/{talent.rangMax}</p>
                                                </div>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    disabled={!canLearn || isMaxRank}
                                                    onClick={() => learnTalent(talent.id)}
                                                    className={canLearn ? 'text-primary hover:text-primary' : ''}
                                                >
                                                    <PlusCircle className="h-6 w-6" />
                                                </Button>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start">
                                            <div className="max-w-xs p-2">
                                                <p className="font-bold text-base text-primary mb-1">{talent.nom}</p>
                                                <Separator className="my-2" />
                                                <p className="text-sm mb-2">Effets actuels (Rang {currentRank}):</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    {talent.effets.map((effet, i) => <li key={i} className="text-xs text-green-400">{effet}</li>)}
                                                </ul>
                                                {talent.exigences.length > 0 && (
                                                    <>
                                                        <Separator className="my-2" />
                                                        <div className="space-y-1">
                                                            <p className="text-sm">Prérequis:</p>
                                                            {talent.exigences.map(req => {
                                                                const [reqId, reqRankStr] = req.split(':');
                                                                const reqTalent = playerTalents.find(t => t.id === reqId);
                                                                const hasReq = (player.talents[reqId] || 0) >= parseInt(reqRankStr, 10);
                                                                return <p key={req} className={`text-xs ${hasReq ? 'text-muted-foreground' : 'text-amber-400'}`}>- {reqTalent?.nom} (Rang {reqRankStr})</p>
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </TooltipProvider>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
