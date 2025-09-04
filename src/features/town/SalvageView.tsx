// src/features/town/SalvageView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';
import type { Item } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export const SalvageView: React.FC = () => {
    const { getActiveHero, dismantleItem, gameData } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        dismantleItem: state.dismantleItem,
        gameData: state.gameData,
    }));
    const { toast } = useToast();

    const activeHero = getActiveHero();
    if (!activeHero) return <p>Aucun héros actif.</p>;
    const { inventory } = activeHero;
    const { components } = gameData;

    const getMaterialName = (materialId: string) => {
        const component = components.find(c => c.id === materialId);
        return component ? component.name : materialId;
    };

    const handleDismantle = (itemId: string) => {
        const materialsGained = dismantleItem(itemId);
        if (materialsGained && materialsGained.length > 0) {
            toast({
                title: 'Objet démantelé',
                description: `Vous avez obtenu: ${materialsGained.map(m => `${m.amount}x ${getMaterialName(m.id)}`).join(', ')}`,
            });
        } else if (materialsGained) {
             toast({
                title: 'Récupération',
                description: "Cet objet n'a fourni aucun matériau utile.",
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Récupération</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    Démantelez des objets de votre inventaire pour en extraire des matériaux d&apos;artisanat.
                </p>
                <ScrollArea className="h-[400px]">
                    {inventory.items.length > 0 ? (
                        <ul className="space-y-2 pr-4">
                            {inventory.items.filter(item => item.type !== 'quest').map((item: Item) => (
                                <li key={item.id} className="border p-2 rounded flex justify-between items-center bg-card-foreground/5 hover:bg-card-foreground/10">
                                    <ItemTooltip item={item}>
                                        <div className="flex-grow">
                                            <span>{item.name}</span>
                                            <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                        </div>
                                    </ItemTooltip>
                                   <Button size="sm" variant="destructive" onClick={() => handleDismantle(item.id)}>
                                     Démanteler
                                   </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center mt-8">Vos sacs sont vides.</p>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
