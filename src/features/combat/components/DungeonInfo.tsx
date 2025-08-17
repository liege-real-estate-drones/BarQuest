
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Dungeon } from "@/lib/types";
import { Waves, Flame, Sprout, Skull } from 'lucide-react';

const biomeIcons: Record<Dungeon['biome'], React.ReactNode> = {
    fire: <Flame className="h-4 w-4 text-red-500" />,
    frost: <Waves className="h-4 w-4 text-blue-400" />,
    nature: <Sprout className="h-4 w-4 text-green-500" />,
    occult: <Skull className="h-4 w-4 text-purple-500" />,
};

export function DungeonInfo({ dungeon }: { dungeon: Dungeon }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>{dungeon.name}</span>
                    {biomeIcons[dungeon.biome]}
                </CardTitle>
                <CardDescription>Palier {dungeon.palier}</CardDescription>
            </CardHeader>
            <CardContent>
                <h4 className="font-semibold text-sm mb-2">Modificateurs</h4>
                <Separator className="mb-3" />
                {dungeon.modifiers && dungeon.modifiers.length > 0 ? (
                    <ul className="space-y-2">
                        {dungeon.modifiers.map((mod, index) => (
                            <li key={index} className="text-xs text-primary bg-primary/10 p-2 rounded-md">{mod}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground">Aucun modificateur actif.</p>
                )}
            </CardContent>
        </Card>
    );
}
