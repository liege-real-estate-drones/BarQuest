'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';

export function InventoryView() {
    const { gold, items } = useGameStore(state => state.inventory);
    return (
        <Card>
            <CardHeader>
                <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Gold: {gold}</p>
                <h3 className="mt-4 font-bold">Items:</h3>
                {items.length > 0 ? (
                    <ul>
                        {items.map(item => (
                            <li key={item.id}>{item.name} (iLvl {item.ilevel})</li>
                        ))}
                    </ul>
                ) : (
                    <p>No items.</p>
                )}
            </CardContent>
        </Card>
    );
}
