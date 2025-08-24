
'use client';
import { Progress } from "@/components/ui/progress";
import type { Dungeon } from "@/lib/types";
import { Waves, Flame, Sprout, Skull } from 'lucide-react';

const biomeIcons: Record<Dungeon['biome'], React.ReactNode> = {
    fire: <Flame className="h-4 w-4 text-red-500" />,
    ice: <Waves className="h-4 w-4 text-blue-400" />,
    nature: <Sprout className="h-4 w-4 text-green-500" />,
    shadow: <Skull className="h-4 w-4 text-purple-500" />,
};

interface DungeonInfoProps {
  dungeon: Dungeon;
  killCount: number;
}

export function DungeonInfo({ dungeon, killCount }: DungeonInfoProps) {
    const progress = (killCount / dungeon.killTarget) * 100;

    return (
        <div className="flex items-center justify-between w-full gap-4">
            <div className="flex-shrink-0">
                <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                    {biomeIcons[dungeon.biome]}
                    {dungeon.name}
                </h3>
                <p className="text-xs text-muted-foreground ml-6">Palier {dungeon.palier}</p>
            </div>
            <div className="flex-grow">
                <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-semibold">Progression</p>
                    <p className="text-xs font-mono text-muted-foreground">{killCount} / {dungeon.killTarget}</p>
                </div>
                <Progress value={progress} className="h-2" />
            </div>
        </div>
    );
}
