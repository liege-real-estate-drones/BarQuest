
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Dungeon } from "@/lib/types";
import { Waves, Flame, Sprout, Skull } from 'lucide-react';

const biomeIcons: Record<Dungeon['biome'], React.ReactNode> = {
    fire: <Flame className="h-4 w-4 text-red-500" />,
    ice: <Waves className="h-4 w-4 text-blue-400" />,
    nature: <Sprout className="h-4 w-4 text-green-500" />,
    shadow: <Skull className="h-4 w-4 text-purple-500" />,
};

export function DungeonInfo({ dungeon }: { dungeon: Dungeon }) {
    return (
        <div className="flex items-center justify-between w-full">
            <div>
                <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                    {biomeIcons[dungeon.biome]}
                    {dungeon.name}
                </h3>
                <p className="text-xs text-muted-foreground ml-6 md:ml-0">Palier {dungeon.palier}</p>
            </div>
            <div className="hidden md:block text-right">
                 <h4 className="font-semibold text-xs mb-1">Modificateurs</h4>
                 {dungeon.modifiers && dungeon.modifiers.length > 0 ? (
                    <div className="flex gap-2 justify-end">
                        {dungeon.modifiers.map((mod, index) => (
                            <span key={index} className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md">{mod}</span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">Aucun.</p>
                )}
            </div>
        </div>
    );
}
