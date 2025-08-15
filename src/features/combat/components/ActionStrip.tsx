'use client';

import { Button } from "@/components/ui/button";
import type { Talent } from "@/lib/types";
import { Dices, Heart, Shield, Zap } from "lucide-react";
import { useEffect } from "react";

interface ActionStripProps {
    onSkill1: () => void;
    onPotion: () => void;
    onRetreat: () => void;
    isSkill1Ready: boolean;
    isSkill1Auto: boolean;
    skills: Talent[];
}

export function ActionStrip({ onSkill1, onPotion, onRetreat, isSkill1Ready, isSkill1Auto, skills }: ActionStripProps) {

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (event.key.toUpperCase()) {
                case '1':
                case ' ':
                    if (isSkill1Ready) onSkill1();
                    break;
                case '2':
                    onPotion();
                    break;
                case 'R':
                    onRetreat();
                    break;
                // Add keybinds for skills 3, 4, 5 etc. later
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [onSkill1, onPotion, onRetreat, isSkill1Ready]);

    return (
        <div className="flex justify-center items-center gap-2 p-2 border-t bg-background/80 backdrop-blur-sm">
            <Button onClick={onSkill1} disabled={!isSkill1Ready || isSkill1Auto} className="w-28 h-16 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Dices />
                    <span>Attaque</span>
                </div>
                <span className="text-xs text-primary-foreground/70">[1]</span>
            </Button>

            {skills.map((skill, index) => (
                 <Button key={skill.id} variant="secondary" className="w-28 h-16 flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Zap />
                        <span>{skill.nom}</span>
                    </div>
                    <span className="text-xs text-secondary-foreground/70">[{index + 2}]</span>
                </Button>
            ))}

            <Button variant="secondary" onClick={onPotion} className="w-28 h-16 flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <Heart />
                    <span>Potion</span>
                </div>
                <span className="text-xs text-secondary-foreground/70">[P]</span>
            </Button>
            <Button variant="outline" onClick={onRetreat} className="w-28 h-16 flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <Shield />
                    <span>Retraite</span>
                </div>
                <span className="text-xs text-muted-foreground/70">[R]</span>
            </Button>
        </div>
    );
}
