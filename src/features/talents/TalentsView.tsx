
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

import { getRankValue } from '@/core/formulas';
import { STAT_DISPLAY_NAMES } from '@/lib/constants';

const describeStatMod = (mod: any, rank: number, fullDescription: boolean = false): string | null => {
    const statName = STAT_DISPLAY_NAMES[mod.stat as keyof typeof STAT_DISPLAY_NAMES] || mod.stat;
    const isSpeed = mod.stat === 'Vitesse';

    if (Array.isArray(mod.value)) {
        let values: string[];
        if (mod.modifier === 'multiplicative') {
            values = mod.value.map((v: number) => {
                const percentage = isSpeed ? (1 - v) * 100 : (v - 1) * 100;
                return `${percentage.toFixed(0)}%`;
            });
        } else { // additive
            values = mod.value.map((v: number) => `${v}`);
        }

        if (fullDescription) {
            return `Augmente ${statName} de ${values.join('/')}.`;
        }

        const index = rank > 0 ? rank - 1 : 0;
        const displayValue = values[index] || values[values.length - 1];
        return `Augmente ${statName} de ${displayValue}.`;

    } else { // single value
        let valueText: string;
        if (mod.modifier === 'multiplicative') {
            const percentage = isSpeed ? (1 - mod.value) * 100 : (mod.value - 1) * 100;
            valueText = `${percentage.toFixed(0)}%`;
        } else {
            valueText = `${mod.value}`;
        }
        return `Augmente ${statName} de ${valueText}.`;
    }
};

const getTalentDescription = (talent: Talent, gameData: GameData, rank: number, fullDescription: boolean = false): string => {
    if (talent.description && fullDescription) {
        if (Array.isArray(talent.description)) {
            return talent.description.join(' ');
        }
        return talent.description;
    }

    const descriptionParts: string[] = [];

    if (talent.effects) {
        for (const effect of talent.effects) {
            const anyEffect = effect as any;
            switch (anyEffect.type) {
                case 'buff':
                    if (anyEffect.buffType === 'stat_modifier' && anyEffect.statMods) {
                        for (const mod of anyEffect.statMods) {
                            const desc = describeStatMod(mod, rank, fullDescription);
                            if (desc) descriptionParts.push(desc);
                        }
                    }
                    break;
                case 'on_hit_effect':
                     if (anyEffect.effect === 'ignore_armor' && anyEffect.value) {
                        const chance = anyEffect.chance * 100;
                        const value = getRankValue(anyEffect.value, rank);
                        const valueText = fullDescription && Array.isArray(anyEffect.value)
                            ? anyEffect.value.map((v: number) => `${v*100}%`).join('/')
                            : `${value * 100}%`;
                        descriptionParts.push(`Vos attaques ont ${chance}% de chance d'ignorer ${valueText} de l'armure de la cible.`);
                    }
                    break;
                // Add more cases here
            }
        }
    }

    if (talent.skill_mods) {
        for (const skillMod of talent.skill_mods) {
            const skill = gameData.skills.find(s => s.id === skillMod.skill_id);
            if (skill) {
                for (const mod of skillMod.modifications) {
                    const value = getRankValue(mod.value, rank);
                    const valueText = fullDescription && Array.isArray(mod.value)
                        ? mod.value.map(v => `${(v-1)*100}%`).join('/')
                        : `${(value-1)*100}%`;
                    descriptionParts.push(`Augmente les dégâts de ${skill.nom} de ${valueText}.`);
                }
            }
        }
    }

    if (talent.triggeredEffects) {
        for (const triggered of talent.triggeredEffects) {
            const chanceValue = triggered.chance ?? 1;
            const chanceForRank = getRankValue(chanceValue, rank) * 100;

            let chanceText = '';
            if (fullDescription && Array.isArray(chanceValue)) {
                chanceText = ` (${chanceValue.map(c => `${c*100}%`).join('/')} de chance)`;
            } else if (chanceForRank < 100) {
                chanceText = ` (${chanceForRank.toFixed(0)}% de chance)`;
            }

            const triggerDict: Record<string, string> = {
                on_dodge: "Après avoir esquivé",
                on_critical_hit: "Après un coup critique",
                on_hit: "En touchant un ennemi"
            };
            const triggerText = triggerDict[triggered.trigger as keyof typeof triggerDict] || "Au déclenchement";

            const effectDescriptions = triggered.effects.map(effect => {
                const anyEffect = effect as any;
                if (anyEffect.type === 'buff' && anyEffect.buffType === 'stat_modifier' && anyEffect.statMods) {
                    return anyEffect.statMods.map((mod: any) => describeStatMod(mod, rank, fullDescription)).filter(Boolean).join(', ');
                }
                return null;
            }).filter(Boolean).join(' ');

            if (effectDescriptions) {
                descriptionParts.push(`${triggerText}${chanceText}: ${effectDescriptions}`);
            } else {
                descriptionParts.push(`${triggerText}${chanceText}, un effet spécial se produit.`);
            }
        }
    }

    if (descriptionParts.length > 0) {
        return descriptionParts.join(' ');
    }

    if (talent.effets && talent.effets.length > 0) {
        return talent.effets.join(' ');
    }

    return rank > 0 ? "Effet passif complexe." : "Apprenez ce talent pour voir son effet.";
};

const TalentPopoverContent = ({ talent, player, gameData }: { talent: Talent; player: PlayerState; gameData: GameData }) => {
    const currentRank = player.learnedTalents[talent.id] || 0;
    const isMaxRank = currentRank === talent.rangMax;

    const currentEffect = getTalentDescription(talent, gameData, currentRank, false);
    const nextEffect = !isMaxRank ? getTalentDescription(talent, gameData, currentRank + 1, false) : null;
    const fullDesc = getTalentDescription(talent, gameData, currentRank, true);

    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{talent.nom}</p>
            <p className="text-sm text-muted-foreground capitalize">Talent Passif (Rang {currentRank}/{talent.rangMax})</p>
            <Separator className="my-2" />
            
            <div className="space-y-1 mb-2">
                <p className="text-sm">Effet (Rang {currentRank}):</p>
                <p className="text-xs text-green-400">
                    {currentRank > 0 ? currentEffect : "Non appris"}
                </p>
            </div>

            {nextEffect && (
                <div className="space-y-1 mb-2">
                    <p className="text-sm">Prochain rang:</p>
                    <p className="text-xs text-green-300/80">
                        {nextEffect}
                    </p>
                </div>
            )}

            {fullDesc && fullDesc !== currentEffect && (
                 <div className="space-y-1 mb-2">
                    <p className="text-sm">Description complète:</p>
                    <p className="text-xs text-muted-foreground">
                        {fullDesc}
                    </p>
                </div>
            )}

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
    const { getActiveHero, gameData, learnTalent } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
        learnTalent: state.learnTalent,
    }));

    const activeHero = getActiveHero();
    if (!activeHero) {
        return (
            <Card className="h-full flex flex-col items-center justify-center">
                <CardHeader>
                    <CardTitle>Talents</CardTitle>
                    <CardDescription>Aucun héros actif.</CardDescription>
                </CardHeader>
            </Card>
        );
    }
    const { player } = activeHero;
    const { talentPoints } = player;

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