'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item } from '@/lib/types';
import { useGameStore } from '@/state/gameStore';

const rarityColorMap: Record<Item['rarity'], string> = {
    common: 'text-gray-400',
    uncommon: 'text-green-400',
    rare: 'text-blue-400',
    epic: 'text-purple-500',
};

export function InventoryView() {
    const { gold, items } = useGameStore(state => state.inventory);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent>
                <div><Badge variant="secondary">{gold} Gold</Badge></div>
                <h3 className="mt-4 font-bold mb-2">Items:</h3>
                {items.length > 0 ? (
                    <ul className="space-y-1">
                        {items.map((item, index) => (
                            <li key={index} className={rarityColorMap[item.rarity]}>
                                [{item.name}] <span className="text-xs text-muted-foreground">(iLvl {item.ilevel})</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground">Your bags are empty.</p>
                )}
            </CardContent>
        </Card>
    );
}
