'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Item } from '@/lib/types';
import { useGameStore, calculateItemScore } from '@/state/gameStore';
import { Coins, Swords, FlaskConical, Droplets, Plus, Minus, Equal } from 'lucide-react';
import { ItemTooltip } from '@/components/ItemTooltip';

const ComparisonIndicator = ({ comparison }: { comparison: 'better' | 'worse' | 'equal' }) => {
    if (comparison === 'better') {
        return <span className="text-green-500 flex items-center text-xs">[<Plus className="h-3 w-3" />]</span>;
    }
    if (comparison === 'worse') {
        return <span className="text-red-500 flex items-center text-xs">[<Minus className="h-3 w-3" />]</span>;
    }
    return <span className="text-gray-500 flex items-center text-xs">[<Equal className="h-3 w-3" />]</span>;
};


export function InventoryView() {
    const { inventory, equipItem, player } = useGameStore(state => ({
        inventory: state.inventory,
        equipItem: state.equipItem,
        player: state.player,
    }));

    const getComparison = (item: Item): 'better' | 'worse' | 'equal' => {
        if (!player.classeId) return 'equal';

        let equippedItem: Item | null = null;
        if (item.slot === 'ring') {
            const ring1 = inventory.equipment.ring;
            const ring2 = inventory.equipment.ring2;
            if (ring1 && ring2) {
                const ring1Score = calculateItemScore(ring1, player.classeId);
                const ring2Score = calculateItemScore(ring2, player.classeId);
                equippedItem = ring1Score < ring2Score ? ring1 : ring2;
            } else {
                return 'better';
            }
        } else {
            equippedItem = inventory.equipment[item.slot as keyof typeof inventory.equipment];
        }

        if (!equippedItem) {
            return 'better';
        }

        const itemScore = calculateItemScore(item, player.classeId);
        const equippedScore = calculateItemScore(equippedItem, player.classeId);
        
        if (itemScore > equippedScore) return 'better';
        if (itemScore < equippedScore) return 'worse';
        return 'equal';
    };

    const getEquippedForTooltip = (item: Item): Item | null => {
        if (item.slot !== 'ring') {
            return inventory.equipment[item.slot as keyof typeof inventory.equipment];
        }
        const { ring, ring2 } = inventory.equipment;
        if (ring && ring2) {
            if (!player.classeId) return ring;
            const ring1Score = calculateItemScore(ring, player.classeId);
            const ring2Score = calculateItemScore(ring2, player.classeId);
            return ring1Score < ring2Score ? ring : ring2;
        }
        return null;
    };

    return (
        <Card className="h-full flex flex-col border-0 shadow-none">
            <CardHeader>
                <CardTitle>Inventaire</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
                <div className="flex gap-4 flex-wrap">
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
                                       <div className="flex items-center gap-2">
                                            <ComparisonIndicator comparison={getComparison(item)} />
                                            <ItemTooltip item={item} equippedItem={getEquippedForTooltip(item)}>
                                                <div className="flex-grow">
                                                    <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                                </div>
                                            </ItemTooltip>
                                        </div>
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
