'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Rareté, Item } from '@/lib/types';
import { useGameStore } from '@/state/gameStore';
import { Coins, Swords, FlaskConical } from 'lucide-react';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

function ItemPopoverContent({ item }: { item: Item }) {
    return (
        <div className="p-2 text-xs w-64">
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


export function InventoryView() {
    const { inventory, equipItem } = useGameStore(state => ({
        inventory: state.inventory,
        equipItem: state.equipItem,
    }));
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Inventaire</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
                <div className="flex gap-4">
                    <Badge variant="secondary" className="text-base"><Coins className="mr-2 h-4 w-4" /> {inventory.gold} Or</Badge>
                    <Badge variant="secondary" className="text-base"><FlaskConical className="mr-2 h-4 w-4" /> {inventory.potions} Potions</Badge>
                </div>
                
                <div className="flex-grow relative">
                  <ScrollArea className="absolute inset-0">
                        {inventory.items.length > 0 ? (
                            <ul className="space-y-2 pr-4">
                                {inventory.items.map((item) => (
                                    <li key={item.id} className="border p-2 rounded flex justify-between items-center bg-card-foreground/5 hover:bg-card-foreground/10">
                                       <Popover>
                                            <PopoverTrigger asChild>
                                                <div className="cursor-pointer">
                                                    <span className={`${rarityColorMap[item.rarity]} underline decoration-dashed`}>
                                                        {item.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent side="right" align="start">
                                                <ItemPopoverContent item={item} />
                                            </PopoverContent>
                                       </Popover>
                                       <Button size="sm" variant="outline" onClick={() => equipItem(item.id)}>
                                         <Swords className="mr-2 h-4 w-4"/>
                                         Équiper
                                       </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center mt-8">Vos sacs sont vides.</p>
                        )}
                   </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
