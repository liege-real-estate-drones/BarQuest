
'use client';

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Talent } from "@/lib/types";
import { Bot, Dices, Heart, Shield, Zap } from "lucide-react";
import { useEffect } from "react";

interface ActionStripProps {
    onSkill1: () => void;
    onPotion: () => void;
    onRetreat: () => void;
    isSkill1Ready: boolean;
    isSkill1Auto: boolean;
    skills: Talent[];
    toggleAutoAttack: () => void;
}

export function ActionStrip({ onSkill1, onPotion, onRetreat, isSkill1Ready, isSkill1Auto, skills, toggleAutoAttack }: ActionStripProps) {

    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT') return;

            switch (event.key.toUpperCase()) {
                case '1':
                case ' ': // Spacebar for main attack
                    if (isSkill1Ready && !isSkill1Auto) onSkill1();
                    break;
                case '2': // Potion
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
    }, [onSkill1, onPotion, onRetreat, isSkill1Ready, isSkill1Auto]);

    return (
        <div className="flex justify-center items-center gap-2">
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
                    <span className="text-xs text-secondary-foreground/70">[{index + 3}]</span>
                </Button>
            ))}

            <Button variant="secondary" onClick={onPotion} className="w-28 h-16 flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <Heart />
                    <span>Potion</span>
                </div>
                <span className="text-xs text-secondary-foreground/70">[2]</span>
            </Button>
            <Button variant="outline" onClick={onRetreat} className="w-28 h-16 flex-col gap-1">
                 <div className="flex items-center gap-2">
                    <Shield />
                    <span>Retraite</span>
                </div>
                <span className="text-xs text-muted-foreground/70">[R]</span>
            </Button>
             <div className="flex items-center space-x-2 ml-4">
                <Switch id="auto-attack-switch" checked={isSkill1Auto} onCheckedChange={toggleAutoAttack} />
                <Label htmlFor="auto-attack-switch" className="flex items-center gap-2 cursor-pointer">
                    <Bot />
                    Auto
                </Label>
            </div>
        </div>
    );
}
