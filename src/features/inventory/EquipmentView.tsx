'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { Item } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BaggageClaim } from 'lucide-react';
import { ItemTooltip } from '@/components/ItemTooltip';

function EquipmentSlot({ slotName, item }: { slotName: string; item: Item | null }) {
    const unequipItem = useGameStore(s => s.unequipItem);

    return (
        <div className="flex items-center justify-between p-2 rounded-md bg-card-foreground/5">
            <span className="text-sm capitalize text-muted-foreground w-1/4">{slotName}</span>
            <div className="flex-grow text-center">
                {item ? (
                     <ItemTooltip item={item} />
                ) : (
                    <span className="text-xs text-muted-foreground/50">Vide</span>
                )}
            </div>
             <div className="w-1/4 text-right">
                {item && (
                     <Button size="sm" variant="ghost" onClick={() => unequipItem(slotName as any)}>
                        <BaggageClaim className="h-4 w-4" />
                     </Button>
                )}
            </div>
        </div>
    );
}


import { ActiveSetBonusesView } from './ActiveSetBonusesView';
import { EQUIPMENT_SLOTS } from '@/lib/constants';

export function EquipmentView() {
    const { equipment } = useGameStore(state => state.inventory);

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Équipement</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                    {EQUIPMENT_SLOTS.map(slot => (
                        <EquipmentSlot key={slot} slotName={slot} item={equipment[slot as keyof typeof equipment]}/>
                    ))}
                    </div>
                </CardContent>
            </Card>
            <ActiveSetBonusesView />
        </div>
    );
}
