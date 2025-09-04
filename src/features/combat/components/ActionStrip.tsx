

'use client';

import { Button } from "@/components/ui/button";
import type { PotionType, Skill } from "@/lib/types";
import { Heart, Shield, Zap, ArrowRightLeft, Coins, Droplets } from "lucide-react";
import { useEffect } from "react";
import { useGameStore } from "@/state/gameStore";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getSkillResourceCost } from "@/core/formulas";

function SkillTooltipContent({ skill, player, gameData }: { skill: Skill; player: any; gameData: any; }) {
    const effects = skill.effets || [];
    const resourceCost = getSkillResourceCost(skill, player, gameData);
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{skill.nom}</p>
            {skill.cooldown > 0 && <p className="text-xs text-muted-foreground">Temps de recharge: {skill.cooldown}s</p>}
            {resourceCost > 0 && <p className="text-xs text-blue-400">Coût: {resourceCost} {player.resources.type}</p>}
            <Separator className="my-2" />
            <p className="text-sm mb-2">Effets :</p>
            <ul className="list-disc list-inside space-y-1">
                {effects.map((effet, i) => <li key={i} className="text-xs text-green-400">{effet}</li>)}
            </ul>
        </div>
    );
}

interface ActionStripProps {
    onRetreat: () => void;
    onCycleTarget: () => void;
    skills: Skill[];
    skillCooldowns: { [skillId: string]: number };
}

const resourceColorMap = {
    'Mana': 'text-blue-400',
    'Rage': 'text-orange-400',
    'Énergie': 'text-yellow-400',
}

export function ActionStrip({ onRetreat, onCycleTarget, skills, skillCooldowns }: ActionStripProps) {
    const { consumePotion, activateSkill, getActiveHero, gameData } = useGameStore(state => ({
        consumePotion: state.consumePotion,
        activateSkill: state.activateSkill,
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
    }));

    const activeHero = getActiveHero();
    if (!activeHero) return null;
    const { player, inventory } = activeHero;
    
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (event.key >= '1' && event.key <= '4') {
                const skillIndex = parseInt(event.key, 10) - 1;
                if (skills[skillIndex]) {
                    activateSkill(skills[skillIndex].id);
                }
            }

            switch (event.key.toUpperCase()) {
                case 'R':
                    onRetreat();
                    break;
                case 'T':
                    onCycleTarget();
                    break;
                case 'Q':
                    consumePotion('health');
                    break;
                case 'W':
                    consumePotion('resource');
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [consumePotion, onRetreat, onCycleTarget, skills, activateSkill]);

    return (
        <TooltipProvider>
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 w-full">
                {/* Skills */}
                <div className="grid grid-cols-4 gap-2 w-full md:w-auto md:flex md:gap-2">
                    {skills.map((skill) => {
                        const cooldown = skillCooldowns[skill.id];
                        const isCoolingDown = cooldown > 0;
                        const cooldownProgress = (cooldown / (skill.cooldown * 1000)) * 100;

                        const resourceCost = getSkillResourceCost(skill, player, gameData);
                        const hasEnoughResource = player.resources.current >= resourceCost;

                        const colorClass = resourceColorMap[player.resources.type as keyof typeof resourceColorMap] || 'text-muted-foreground';
                        const isDisabled = isCoolingDown || !hasEnoughResource;

                        return (
                            <Tooltip key={skill.id}>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="secondary" 
                                        className={cn(
                                            "h-16 md:w-24 md:h-20 flex-col gap-1 text-xs relative overflow-hidden transition-all",
                                            isDisabled && "grayscale"
                                        )}
                                        onClick={() => activateSkill(skill.id)}
                                        disabled={isDisabled}
                                    >
                                        <Zap size={20} className="md:w-6 md:h-6" />
                                        <span className="truncate">{skill.nom}</span>
                                        {isCoolingDown && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-lg font-bold text-white">
                                                {Math.ceil(cooldown / 1000)}s
                                            </div>
                                        )}
                                        {isCoolingDown && (
                                            <Progress value={100 - cooldownProgress} className="absolute bottom-0 left-0 w-full h-1 bg-transparent" indicatorClassName="bg-white/30" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    <SkillTooltipContent skill={skill} player={player} gameData={gameData} />
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                    {[...Array(4 - (skills?.length || 0))].map((_, index) => (
                        <div key={`empty-${index}`} className="h-16 md:w-24 md:h-20 rounded-md bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">
                            Vide
                        </div>
                    ))}
                </div>
                
                <Separator orientation="horizontal" className="w-full my-2 md:hidden" />
                <Separator orientation="vertical" className="h-16 hidden md:block mx-2" />

                {/* Utilities */}
                <div className="grid grid-cols-4 gap-2 w-full md:w-auto md:flex md:gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={onCycleTarget} className="h-14 md:h-12 flex-col gap-1 text-xs md:w-20">
                                <ArrowRightLeft size={20} />
                                <span className="text-muted-foreground/70 text-[10px]">[T]</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Changer de Cible</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" onClick={() => consumePotion('health')} className="flex-col gap-1 text-xs relative h-14 md:h-12 md:w-20" disabled={inventory.potions.health <= 0}>
                                <Heart size={20} />
                                <span className="text-muted-foreground/70 text-[10px]">[Q]</span>
                                {inventory.potions.health > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                                        {inventory.potions.health}
                                    </div>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Utiliser une Potion de Vie</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" onClick={() => consumePotion('resource')} className="flex-col gap-1 text-xs relative h-14 md:h-12 md:w-20" disabled={inventory.potions.resource <= 0}>
                                <Droplets size={20} />
                                <span className="text-muted-foreground/70 text-[10px]">[W]</span>
                                {inventory.potions.resource > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                                        {inventory.potions.resource}
                                    </div>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Utiliser une Potion de {player.resources.type}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                         <TooltipTrigger asChild>
                            <Button variant="outline" onClick={onRetreat} className="flex-col gap-1 text-xs h-14 md:h-12 md:w-20">
                                <Shield size={20} />
                                <span className="text-muted-foreground/70 text-[10px]">[R]</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Retraite</p></TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    );
}
