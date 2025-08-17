
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGameStore } from '@/state/gameStore';
import { PlusCircle, Star, Zap } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Talent, Skill, GameData, PlayerState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const TalentPopoverContent = ({ talent, player, gameData }: { talent: Talent; player: PlayerState; gameData: GameData }) => {
    const currentRank = player.learnedTalents[talent.id] || 0;
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{talent.nom}</p>
            <p className="text-sm text-muted-foreground capitalize">Talent Passif (Rang {currentRank}/{talent.rangMax})</p>
            <Separator className="my-2" />
            <p className="text-sm mb-2">Effet :</p>
            <p className="text-xs text-green-400">{talent.effets[0]}</p>
            
            {(talent.exigences?.length > 0 || talent.niveauRequis) && (
                <>
                    <Separator className="my-2" />
                    <div className="space-y-1">
                        <p className="text-sm">Prérequis:</p>
                        {talent.niveauRequis && <p className={`text-xs ${player.level >= talent.niveauRequis ? 'text-muted-foreground' : 'text-amber-400'}`}>- Niveau {talent.niveauRequis}</p>}
                        {talent.exigences.map(req => {
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

    return (
        <div className={cn("ml-8 pl-4 border-l border-dashed border-primary/20", { 'opacity-50 grayscale': !canLearn && !isMaxRank })}>
            <div className="flex items-center justify-between p-2 rounded-md bg-card-foreground/5">
                <Popover>
                    <PopoverTrigger asChild>
                        <div className="flex items-center gap-3 cursor-help">
                            <Star className="h-5 w-5 text-yellow-400/50" />
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


const SkillTalentNode = ({ skill, talents, player, gameData, canLearnTalent, learnTalent }: { skill: Skill, talents: Talent[], player: PlayerState, gameData: GameData, canLearnTalent: (id: string) => boolean, learnTalent: (id: string) => void }) => {
    return (
        <AccordionItem value={skill.id}>
            <AccordionTrigger className="hover:bg-accent/50 px-4 rounded-md">
                 <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-yellow-400" />
                    <p className="text-lg font-headline">{skill.nom}</p>
                 </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
                <div className="space-y-2">
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
            </AccordionContent>
        </AccordionItem>
    );
};


export function TalentsView() {
    const { player, gameData, learnTalent, talentPoints } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        learnTalent: state.learnTalent,
        talentPoints: state.player.talentPoints
    }));

    if (!player.classeId) return null;

    const playerSkills = gameData.skills.filter(s => s.classeId === player.classeId && s.niveauRequis && player.level >= s.niveauRequis);
    const playerTalents = gameData.talents.filter(t => t.classeId === player.classeId);
    
    const canLearnTalent = (talentId: string): boolean => {
        if (talentPoints <= 0) return false;
        
        const talent = playerTalents.find(t => t.id === talentId);
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
                    <span>Talents & Compétences</span>
                    <span className="text-sm font-medium text-primary">{talentPoints} points restants</span>
                </CardTitle>
                <CardDescription>Dépensez vos points pour améliorer vos compétences actives via des talents passifs.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-full pr-4">
                    <Accordion type="single" collapsible className="w-full">
                       {playerSkills.map(skill => {
                           // Find talents that are for this skill. e.g., berserker_heroic_strike_talent_1 is for berserker_heroic_strike
                           const relatedTalents = playerTalents.filter(t => t.id.startsWith(skill.id));
                           if (relatedTalents.length === 0) return null;
                           
                           return (
                               <SkillTalentNode 
                                  key={skill.id}
                                  skill={skill}
                                  talents={relatedTalents}
                                  player={player}
                                  gameData={gameData}
                                  canLearnTalent={canLearnTalent}
                                  learnTalent={learnTalent}
                                />
                           );
                       })}
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
