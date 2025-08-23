
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGameStore } from '@/state/gameStore';
import { PlusCircle, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Talent, PlayerState, GameData } from '@/lib/types';
import { cn } from '@/lib/utils';

const TalentPopoverContent = ({ talent, player, gameData }: { talent: Talent; player: PlayerState; gameData: GameData }) => {
    const currentRank = player.learnedTalents[talent.id] || 0;
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{talent.nom}</p>
            <p className="text-sm text-muted-foreground capitalize">Talent Passif (Rang {currentRank}/{talent.rangMax})</p>
            <Separator className="my-2" />
            <p className="text-sm mb-2">Effet :</p>
            <p className="text-xs text-green-400">
                {(talent.effets && talent.effets[0]) || "Voir les détails du rang pour l'effet exact."}
            </p>
            
            {(talent.exigences?.length > 0 || talent.niveauRequis) && (
                <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                        <p className="text-sm">Prérequis:</p>
                        {talent.niveauRequis && <p className={`text-xs ${player.level >= talent.niveauRequis ? 'text-muted-foreground' : 'text-amber-400'}`}>- Niveau {talent.niveauRequis}</p>}
                        {talent.exigences?.map(req => {
                            const [reqId, reqRankStr] = req.split(':');
                            const reqTalent = gameData.talents.find(t => t.id === reqId);
                             const hasReq = (player.learnedTalents[reqId] || 0) >= parseInt(reqRankStr, 10);
                            return <p key={req} className={`text-xs ${hasReq ? 'text-muted-foreground' : 'text-amber-400'}`}>- {reqTalent?.nom} (Rang {reqRankStr})</p>
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

const TalentRow = ({ talent, canLearn, onLearn, player, gameData }: { talent: Talent, canLearn: boolean, onLearn: (id: string) => void, player: PlayerState, gameData: GameData }) => {
    const currentRank = player.learnedTalents[talent.id] || 0;
    const isMaxRank = currentRank >= talent.rangMax;
    const isUnlocked = player.level >= (talent.niveauRequis || 0);

    return (
        <div className={cn("ml-4 pl-4 border-l border-dashed border-primary/20", { 'opacity-50 grayscale': !isUnlocked })}>
            <div className="flex items-center justify-between p-2 rounded-md bg-card-foreground/5">
                <Popover>
                    <PopoverTrigger asChild>
                        <div className="flex items-center gap-3 cursor-help">
                            <Star className={cn("h-5 w-5", isMaxRank ? "text-yellow-400" : "text-yellow-400/30")} />
                            <div>
                                <p className="font-semibold">{talent.nom}</p>
                                <p className="text-xs text-muted-foreground">Rang {currentRank}/{talent.rangMax}</p>
                            </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent>
                        <TalentPopoverContent talent={talent} player={player} gameData={gameData} />
                    </PopoverContent>
                </Popover>

                <Button 
                    size="sm" 
                    variant="ghost" 
                    disabled={!canLearn || isMaxRank}
                    onClick={() => onLearn(talent.id)}
                    className={cn(canLearn && !isMaxRank && 'text-primary hover:text-primary')}
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    {isMaxRank ? 'Max' : 'Apprendre'}
                </Button>
            </div>
        </div>
    )
}

const TalentTree = ({ title, talents, player, gameData, canLearnTalent, learnTalent }: { title: string, talents: Talent[], player: PlayerState, gameData: GameData, canLearnTalent: (id: string) => boolean, learnTalent: (id: string) => void }) => {
    return (
        <div className="flex flex-col gap-4 p-2 rounded-lg bg-background/50">
            <h3 className="text-lg font-headline text-center text-primary">{title}</h3>
            <ScrollArea className="h-[500px] pr-4">
                 <div className="space-y-4">
                    {talents.map(talent => (
                        <TalentRow 
                            key={talent.id} 
                            talent={talent} 
                            canLearn={canLearnTalent(talent.id)}
                            onLearn={learnTalent}
                            player={player}
                            gameData={gameData}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

const talentTreesByClass: Record<string, string[]> = {
  berserker: ['Armes', 'Fureur', 'Titan'],
  mage: ['Feu', 'Givre', 'Arcane'],
  rogue: ['Assassinat', 'Subtilite', 'Poison'],
  cleric: ['Sacre', 'Discipline', 'Chatiment'],
};


export function TalentsView() {
    const { player, gameData, learnTalent, talentPoints } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        learnTalent: state.learnTalent,
        talentPoints: state.player.talentPoints
    }));

    if (!player.classeId) return null;

    const classTalentTrees = talentTreesByClass[player.classeId] || [];

    const getTalentsForTree = (treeName: string) => {
        const prefix = `${player.classeId}_${treeName.toLowerCase()}`;
        return gameData.talents.filter(t => t.id.startsWith(prefix)).sort((a,b) => (a.niveauRequis || 0) - (b.niveauRequis || 0));
    };
    
    const canLearnTalent = (talentId: string): boolean => {
        if (talentPoints <= 0) return false;
        
        const talent = gameData.talents.find(t => t.id === talentId);
        if (!talent) return false;

        if (talent.niveauRequis && player.level < talent.niveauRequis) return false;

        const currentRank = player.learnedTalents[talent.id] || 0;
        if (currentRank >= talent.rangMax) return false;

        if (!talent.exigences || talent.exigences.length === 0) return true;

        return talent.exigences.every(req => {
            const [reqId, reqRankStr] = req.split(':');
            const reqRank = parseInt(reqRankStr, 10);
            return (player.learnedTalents[reqId] || 0) >= reqRank;
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Talents</span>
                    <span className="text-sm font-medium text-primary">{talentPoints} points restants</span>
                </CardTitle>
                <CardDescription>Dépensez vos points pour apprendre des améliorations passives.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    {classTalentTrees.map(treeName => (
                        <TalentTree
                            key={treeName}
                            title={treeName}
                            talents={getTalentsForTree(treeName)}
                            player={player}
                            gameData={gameData}
                            canLearnTalent={canLearnTalent}
                            learnTalent={learnTalent}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
