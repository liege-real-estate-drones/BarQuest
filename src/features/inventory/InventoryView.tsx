'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item } from '@/lib/types';
import { useGameStore } from '@/state/gameStore';
import { Coins, Swords, FlaskConical, Droplets } from 'lucide-react';
import { ItemTooltip } from '@/components/ItemTooltip';

export function InventoryView() {
    const { inventory, equipItem, player } = useGameStore(state => ({
        inventory: state.inventory,
        equipItem: state.equipItem,
        player: state.player,
    }));
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Inventaire</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
                <div className="flex gap-4">
                    <Badge variant="secondary" className="text-base"><Coins className="mr-2 h-4 w-4" /> {inventory.gold} Or</Badge>
                    <Badge variant="secondary" className="text-base"><FlaskConical className="mr-2 h-4 w-4" /> {inventory.potions.health} Potions de Vie</Badge>
                    <Badge variant="secondary" className="text-base"><Droplets className="mr-2 h-4 w-4" /> {inventory.potions.resource} Potions de {player.resources.type}</Badge>
                </div>
                
                <div className="flex-grow relative">
                  <ScrollArea className="absolute inset-0">
                        {inventory.items.length > 0 ? (
                            <ul className="space-y-2 pr-4">
                                {inventory.items.map((item: Item) => (
                                    <li key={item.id} className="border p-2 rounded flex justify-between items-center bg-card-foreground/5 hover:bg-card-foreground/10">
                                       <ItemTooltip item={item} equippedItem={inventory.equipment[item.slot as keyof typeof inventory.equipment]}>
                                            <div className="flex-grow">
                                                <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                            </div>
                                       </ItemTooltip>
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
