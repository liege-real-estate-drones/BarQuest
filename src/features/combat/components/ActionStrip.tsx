

'use client';

import { Button } from "@/components/ui/button";
import type { Skill } from "@/lib/types";
import { Heart, Shield, Zap, ArrowRightLeft, Coins } from "lucide-react";
import { useEffect } from "react";
import { useGameStore } from "@/state/gameStore";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const getResourceCost = (skill: Skill) => {
    const effects = skill.effets || [];
    const resourceCostMatch = effects.join(' ').match(/Coûte (\d+) (Mana|Rage|Énergie)/);
    return resourceCostMatch ? { amount: resourceCostMatch[1], type: resourceCostMatch[2] } : null;
}

function SkillTooltipContent({ skill }: { skill: Skill }) {
    const effects = skill.effets || [];
    const resourceCost = getResourceCost(skill);
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{skill.nom}</p>
            {skill.cooldown > 0 && <p className="text-xs text-muted-foreground">Temps de recharge: {skill.cooldown}s</p>}
            {resourceCost && <p className="text-xs text-blue-400">Coût: {resourceCost.amount} {resourceCost.type}</p>}
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
}

const resourceColorMap = {
    'Mana': 'text-blue-400',
    'Rage': 'text-orange-400',
    'Énergie': 'text-yellow-400',
}

export function ActionStrip({ onRetreat, onCycleTarget, skills }: ActionStripProps) {
    const { usePotion, inventory, useSkill, skillCooldowns } = useGameStore(state => ({
        usePotion: state.usePotion,
        inventory: state.inventory,
        useSkill: state.useSkill,
        skillCooldowns: state.combat.skillCooldowns,
    }));
    
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (event.key >= '1' && event.key <= '4') {
                const skillIndex = parseInt(event.key, 10) - 1;
                if (skills[skillIndex]) {
                    useSkill(skills[skillIndex].id);
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
                    usePotion();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [usePotion, onRetreat, onCycleTarget, skills, useSkill]);

    return (
        <TooltipProvider>
            <div className="flex flex-col items-center justify-center gap-2 w-full">
                 {/* Skills */}
                <div className="flex justify-center items-center gap-2">
                    {skills.map((skill, index) => {
                         const cooldown = skillCooldowns[skill.id];
                         const isCoolingDown = cooldown > 0;
                         const cooldownProgress = (cooldown / (skill.cooldown * 1000)) * 100;
                         const resourceCost = getResourceCost(skill);
                         const colorClass = resourceCost ? resourceColorMap[resourceCost.type as keyof typeof resourceColorMap] : 'text-muted-foreground';

                         return (
                             <Tooltip key={skill.id}>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="secondary" 
                                        className="w-24 h-20 flex-col gap-1 text-xs relative overflow-hidden" 
                                        onClick={() => useSkill(skill.id)} 
                                        disabled={isCoolingDown}
                                    >
                                        <Zap />
                                        <span className="truncate">{skill.nom}</span>
                                        {resourceCost && (
                                            <span className={`font-mono text-xs ${colorClass}`}>
                                                {resourceCost.amount}
                                            </span>
                                        )}
                                        {isCoolingDown && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-lg font-bold">
                                               {Math.ceil(cooldown / 1000)}
                                            </div>
                                        )}
                                        {isCoolingDown && (
                                             <Progress value={100 - cooldownProgress} className="absolute bottom-0 left-0 w-full h-1 bg-transparent" indicatorClassName="bg-white/30" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                     <SkillTooltipContent skill={skill} />
                                </TooltipContent>
                             </Tooltip>
                         )
                    })}

                    {[...Array(4 - (skills?.length || 0))].map((_, index) => (
                        <div key={`empty-${index}`} className="w-24 h-20 rounded-md bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">
                            Vide
                        </div>
                    ))}
                </div>
                
                 {/* Utilities */}
                 <div className="flex justify-center items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" onClick={onCycleTarget} className="w-20 h-12 flex-col gap-1 text-xs">
                                <ArrowRightLeft />
                                <span className="text-muted-foreground/70">[T]</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Changer de Cible</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                             <Button variant="outline" size="sm" onClick={usePotion} className="flex-col gap-1 text-xs relative h-12 w-20" disabled={inventory.potions <= 0}>
                                <Heart />
                                <span className="text-secondary-foreground/70">[Q]</span>
                                {inventory.potions > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                                        {inventory.potions}
                                    </div>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Utiliser une Potion</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                         <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={onRetreat} className="flex-col gap-1 text-xs h-12 w-20">
                                <Shield />
                                <span className="text-muted-foreground/70">[R]</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>Retraite</p></TooltipContent>
                    </Tooltip>
                 </div>
            </div>
        </TooltipProvider>
    );
}
