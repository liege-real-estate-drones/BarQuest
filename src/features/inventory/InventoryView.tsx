'use client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item, Rareté } from '@/lib/types';
import { useGameStore } from '@/state/gameStore';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
};

export function InventoryView() {
    const { gold, items } = useGameStore(state => state.inventory);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Inventaire</CardTitle>
            </CardHeader>
            <CardContent>
                <div><Badge variant="secondary">{gold} Or</Badge></div>
                <h3 className="mt-4 font-bold mb-2">Objets:</h3>
                {items.length > 0 ? (
                    <ul className="space-y-1">
                        {items.map((item, index) => (
                            <li key={index} className={rarityColorMap[item.rarity]}>
                                [{item.name}] <span className="text-xs text-muted-foreground">(iLvl {item.niveauMin})</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground">Vos sacs sont vides.</p>
                )}
            </CardContent>
        </Card>
    );
}
