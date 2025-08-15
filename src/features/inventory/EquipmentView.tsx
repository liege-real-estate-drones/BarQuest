'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { Item, Rareté } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BaggageClaim } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

function ItemTooltipContent({ item }: { item: Item }) {
    return (
        <div className="p-2 border rounded bg-background shadow-lg text-xs w-64 z-50">
            <h4 className={`font-bold ${rarityColorMap[item.rarity]}`}>{item.name}</h4>
            <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{item.slot}</span>
                <span>Niveau {item.niveauMin}</span>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
                {item.affixes.map((affix, i) => (
                    <p key={i} className="text-green-400">+{affix.val} {affix.ref}</p>
                ))}
            </div>
        </div>
    );
}

function EquipmentSlot({ slotName, item }: { slotName: string; item: Item | null }) {
    const unequipItem = useGameStore(s => s.unequipItem);

    return (
        <div className="flex items-center justify-between p-2 rounded-md bg-card-foreground/5">
            <span className="text-sm capitalize text-muted-foreground w-1/4">{slotName}</span>
            <div className="flex-grow text-center">
                {item ? (
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <span className={`${rarityColorMap[item.rarity]} cursor-default underline decoration-dashed`}>{item.name}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <ItemTooltipContent item={item} />
                        </TooltipContent>
                     </Tooltip>
                ) : (
                    <span className="text-xs text-muted-foreground/50">Vide</span>
                )}
            </div>
             <div className="w-1/4 text-right">
                {item && (
                     <Button size="sm" variant="ghost" onClick={() => unequipItem(item.slot as any)}>
                        <BaggageClaim className="h-4 w-4" />
                     </Button>
                )}
            </div>
        </div>
    );
}


export function EquipmentView() {
    const { equipment } = useGameStore(state => state.inventory);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Équipement</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                {Object.entries(equipment).map(([slot, item]) => (
                    <EquipmentSlot key={slot} slotName={slot} item={item}/>
                ))}
                </div>
            </CardContent>
        </Card>
    );
}