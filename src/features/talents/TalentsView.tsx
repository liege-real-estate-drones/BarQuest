
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGameStore } from '@/state/gameStore';
import { PlusCircle, Zap, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Talent } from '@/lib/types';

const TalentCard = ({ talent, player, gameData, canLearn, currentRank, isMaxRank, onLearn }: { talent: Talent, player: any, gameData: any, canLearn: boolean, currentRank: number, isMaxRank: boolean, onLearn: (id: string) => void }) => {
    const isLockedByLevel = talent.niveauRequis && player.level < talent.niveauRequis;
    
    return (
        <Popover>
            <div className={`border rounded-lg p-3 flex flex-col justify-between transition-all h-full ${(!canLearn && !isMaxRank) || isLockedByLevel ? 'opacity-50 grayscale' : ''}`}>
                <PopoverTrigger asChild>
                    <div className="flex-grow cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-green-400" />
                        <p className="font-semibold">{talent.nom}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">Rang {currentRank}/{talent.rangMax}</p>
                      {isLockedByLevel && <p className="text-xs text-amber-400 ml-6">Requis: Niveau {talent.niveauRequis}</p>}
                    </div>
                </PopoverTrigger>
                <Button 
                    size="sm" 
                    variant="ghost" 
                    disabled={!canLearn || isMaxRank}
                    onClick={() => onLearn(talent.id)}
                    className={`w-full mt-2 ${canLearn ? 'text-primary hover:text-primary' : ''}`}
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {currentRank > 0 ? 'Améliorer' : 'Apprendre'}
                </Button>
            </div>
            <PopoverContent side="bottom" align="start">
                <div className="max-w-xs p-2">
                    <p className="font-bold text-base text-primary mb-1">{talent.nom}</p>
                    <p className="text-sm text-muted-foreground capitalize">Talent Passif</p>
                    <Separator className="my-2" />
                    <p className="text-sm mb-2">Effets (Rang {currentRank > 0 ? currentRank : 1}):</p>
                    <ul className="list-disc list-inside space-y-1">
                        {talent.effets.map((effet, i) => <li key={i} className="text-xs text-green-400">{effet}</li>)}
                    </ul>
                    {(talent.exigences.length > 0 || talent.niveauRequis) && (
                        <>
                            <Separator className="my-2" />
                            <div className="space-y-1">
                                <p className="text-sm">Prérequis:</p>
                                {talent.niveauRequis && <p className={`text-xs ${player.level >= talent.niveauRequis ? 'text-muted-foreground' : 'text-amber-400'}`}>- Niveau {talent.niveauRequis}</p>}
                                {talent.exigences.map(req => {
                                    const [reqId, reqRankStr] = req.split(':');
                                    const reqTalent = [...gameData.talents, ...gameData.skills].find(t => t.id === reqId);
                                    const hasReq = (player.learnedTalents[reqId] || player.learnedSkills[reqId] || 0) >= parseInt(reqRankStr, 10);
                                    return <p key={req} className={`text-xs ${hasReq ? 'text-muted-foreground' : 'text-amber-400'}`}>- {reqTalent?.nom} (Rang {reqRankStr})</p>
                                })}
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

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

        if (talent.niveauRequis && player.level < talent.niveauRequis) return false;

        const currentRank = player.learnedTalents[talent.id] || 0;
        if (currentRank >= talent.rangMax) return false;

        if (talent.exigences.length === 0) return true;

        return talent.exigences.every(req => {
            const [reqId, reqRankStr] = req.split(':');
            const reqRank = parseInt(reqRankStr, 10);
            return (player.learnedSkills[reqId] || 0) >= reqRank || (player.learnedTalents[reqId] || 0) >= reqRank;
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Arbre de Talents</span>
                    <span className="text-sm font-medium text-primary">{talentPoints} points restants</span>
                </CardTitle>
                <CardDescription>Dépensez vos points pour apprendre ou améliorer vos talents passifs.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-full pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playerTalents.map(talent => {
                                const currentRank = player.learnedTalents[talent.id] || 0;
                                const isMaxRank = currentRank >= talent.rangMax;
                                const canLearn = canLearnTalent(talent.id);

                                return (
                                    <TalentCard 
                                        key={talent.id}
                                        talent={talent}
                                        player={player}
                                        gameData={gameData}
                                        canLearn={canLearn}
                                        currentRank={currentRank}
                                        isMaxRank={isMaxRank}
                                        onLearn={learnTalent}
                                    />
                                );
                            })}
                        </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
