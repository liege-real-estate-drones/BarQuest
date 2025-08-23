'use client';

import type { Buff, Debuff } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, Sword, Heart, ArrowUp, ArrowDown, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuffsDisplayProps {
  buffs: Buff[];
  debuffs: Debuff[];
}

const BuffIcon = ({ buff }: { buff: Buff | Debuff }) => {
    const isDebuff = 'isDebuff' in buff && (buff as Debuff).isDebuff;

    // Simple icon selection based on buff name/ID
    const getIcon = () => {
        const name = buff.name.toLowerCase();
        if (name.includes('bouclier') || name.includes('shield')) return <Shield className="h-4 w-4" />;
        if (name.includes('rage') || name.includes('attack') || name.includes('force')) return <Sword className="h-4 w-4" />;
        if (name.includes('soin') || name.includes('heal') || name.includes('rénovation')) return <Heart className="h-4 w-4" />;
        if (name.includes('lenteur') || name.includes('slow')) return <Clock className="h-4 w-4" />;
        if (isDebuff) return <ArrowDown className="h-4 w-4" />;
        return <ArrowUp className="h-4 w-4" />;
    };

    const durationInSeconds = buff.duration ? (buff.duration / 1000).toFixed(1) : null;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "relative flex items-center justify-center h-7 w-7 rounded-md border text-white",
                        isDebuff ? 'bg-red-800/50 border-red-500/60' : 'bg-green-800/50 border-green-500/60'
                    )}>
                        {getIcon()}
                        {buff.stacks && buff.stacks > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-background text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-white border border-foreground/20">
                                {buff.stacks}
                            </span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-bold">{buff.name}</p>
                    {durationInSeconds && <p>Durée: {durationInSeconds}s</p>}
                    {!isDebuff && (buff as Buff).healingPerTick && <p>Soins par tick: {(buff as Buff).healingPerTick}</p>}
                    {isDebuff && (buff as Debuff).damagePerTick && <p>Dégâts par tick: {(buff as Debuff).damagePerTick}</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export function BuffsDisplay({ buffs, debuffs }: BuffsDisplayProps) {
  const allEffects = [...buffs, ...debuffs];

  if (allEffects.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {allEffects.map((effect, index) => (
        <BuffIcon key={`${effect.id}-${index}`} buff={effect} />
      ))}
    </div>
  );
}
