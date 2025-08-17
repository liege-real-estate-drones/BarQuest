
'use client';

import { Button } from "@/components/ui/button";
import type { Skill } from "@/lib/types";
import { Heart, Shield, Zap, ArrowRightLeft } from "lucide-react";
import { useEffect } from "react";
import { useGameStore } from "@/state/gameStore";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

function SkillTooltipContent({ skill }: { skill: Skill }) {
    const effects = skill.effets || [];
    const resourceCostMatch = effects.join(' ').match(/Coûte (\d+) (Mana|Rage|Énergie)/);
    const resourceCost = resourceCostMatch ? `${resourceCostMatch[1]} ${resourceCostMatch[2]}` : null;
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{skill.nom}</p>
            {resourceCost && <p className="text-xs text-blue-400">Coût: {resourceCost}</p>}
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

export function ActionStrip({ onRetreat, onCycleTarget, skills }: ActionStripProps) {
    const { usePotion, inventory, useSkill } = useGameStore(state => ({
        usePotion: state.usePotion,
        inventory: state.inventory,
        useSkill: state.useSkill
    }));

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            switch (event.key.toUpperCase()) {
                case '1':
                    usePotion();
                    break;
                case 'R':
                    onRetreat();
                    break;
                case 'T':
                    onCycleTarget();
                    break;
                case '2':
                case '3':
                case '4':
                case '5':
                    const skillIndex = parseInt(event.key) - 2;
                    if (skills[skillIndex]) {
                        useSkill(skills[skillIndex].id);
                    }
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
            <div className="flex justify-center items-center gap-2 p-2">
                <Button variant="secondary" onClick={usePotion} className="w-24 h-20 flex-col gap-1 text-xs relative" disabled={inventory.potions <= 0}>
                    <div className="flex items-center gap-2">
                        <Heart />
                        <span>Potion</span>
                    </div>
                    <span className="text-secondary-foreground/70">[1]</span>
                    {inventory.potions > 0 && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                            {inventory.potions}
                        </div>
                    )}
                </Button>

                {skills.map((skill, index) => (
                     <Tooltip key={skill.id}>
                        <TooltipTrigger asChild>
                            <Button variant="secondary" className="w-24 h-20 flex-col gap-1 text-xs" onClick={() => useSkill(skill.id)}>
                                <div className="flex items-center gap-2">
                                    <Zap />
                                    <span className="truncate">{skill.nom}</span>
                                </div>
                                <span className="text-secondary-foreground/70">[{index + 2}]</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                             <SkillTooltipContent skill={skill} />
                        </TooltipContent>
                     </Tooltip>
                ))}

                {[...Array(4 - (skills?.length || 0))].map((_, index) => (
                    <div key={`empty-${index}`} className="w-24 h-20 rounded-md bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">
                        Vide
                    </div>
                ))}

                <Button variant="outline" onClick={onCycleTarget} className="w-24 h-20 flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft />
                        <span>Cible</span>
                    </div>
                    <span className="text-muted-foreground/70">[T]</span>
                </Button>
                
                <Button variant="outline" onClick={onRetreat} className="w-24 h-20 flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2">
                        <Shield />
                        <span>Retraite</span>
                    </div>
                    <span className="text-muted-foreground/70">[R]</span>
                </Button>
            </div>
        </TooltipProvider>
    );
}
