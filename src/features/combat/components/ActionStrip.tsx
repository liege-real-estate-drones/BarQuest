
'use client';

import { Button } from "@/components/ui/button";
import type { Talent } from "@/lib/types";
import { Bot, Dices, Heart, Shield, Zap } from "lucide-react";
import { useEffect } from "react";
import { useGameStore } from "@/state/gameStore";

interface ActionStripProps {
    onRetreat: () => void;
    skills: Talent[];
}

export function ActionStrip({ onRetreat, skills }: ActionStripProps) {
    const { usePotion, inventory, useSkill } = useGameStore(state => ({
        usePotion: state.usePotion,
        inventory: state.inventory,
        useSkill: state.useSkill
    }));

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (event.key.toUpperCase()) {
                case '1': // Potion
                    usePotion();
                    break;
                case 'R':
                    onRetreat();
                    break;
                // Keybinds for skills 2, 3, 4 etc.
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
    }, [usePotion, onRetreat, skills, useSkill]);

    return (
        <div className="flex justify-center items-center gap-2 p-2 bg-background/50">
           
            <Button variant="secondary" onClick={usePotion} className="w-24 h-16 flex-col gap-1 text-xs relative" disabled={inventory.potions <= 0}>
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
                 <Button key={skill.id} variant="secondary" className="w-24 h-16 flex-col gap-1 text-xs" onClick={() => useSkill(skill.id)}>
                    <div className="flex items-center gap-2">
                        <Zap />
                        <span>{skill.nom}</span>
                    </div>
                    <span className="text-secondary-foreground/70">[{index + 2}]</span>
                </Button>
            ))}

            <Button variant="outline" onClick={onRetreat} className="w-24 h-16 flex-col gap-1 text-xs">
                 <div className="flex items-center gap-2">
                    <Shield />
                    <span>Retraite</span>
                </div>
                <span className="text-muted-foreground/70">[R]</span>
            </Button>
        </div>
    );
}
