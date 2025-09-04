import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Item } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ItemTooltipContent } from '@/components/ItemTooltip';

const itemSlots = ["weapon", "head", "chest", "legs", "hands", "feet", "belt", "amulet", "ring", "trinket", "offhand"];

export const GamblerView: React.FC = () => {
    const { gambleForItem, worldTier, getActiveHero } = useGameStore(state => ({
        gambleForItem: state.gambleForItem,
        worldTier: state.worldTier,
        getActiveHero: state.getActiveHero,
    }));
    const [lastGambledItem, setLastGambledItem] = React.useState<Item | null>(null);

    const activeHero = getActiveHero();
    if (!activeHero) return <p>Aucun héros actif.</p>;
    const { equipment, gold } = activeHero.inventory;

    const cost = 100 * worldTier;

    const handleGamble = (slot: string) => {
        if (gold < cost) {
            console.log("Not enough gold");
            return;
        }
        const item = gambleForItem(slot);
        if (item) {
            setLastGambledItem(item);
        }
    };

    const equippedItem = lastGambledItem ? equipment[lastGambledItem.slot as keyof typeof equipment] : null;

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold">Le Parieur</h2>
            <p className="text-sm text-muted-foreground mb-4">Tentez votre chance ! Le coût est de {cost} or.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {itemSlots.map(slot => (
                    <Button key={slot} onClick={() => handleGamble(slot)} variant="outline" disabled={gold < cost}>
                        {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </Button>
                ))}
            </div>

            <Dialog open={!!lastGambledItem} onOpenChange={(isOpen) => !isOpen && setLastGambledItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vous avez obtenu un objet !</DialogTitle>
                    </DialogHeader>
                    {lastGambledItem && (
                        <div className="flex space-x-4">
                            <div className="w-1/2">
                                <h3 className="font-semibold mb-2 text-center">Nouvel Objet</h3>
                                <ItemTooltipContent item={lastGambledItem} equippedItem={equippedItem} />
                            </div>
                            <div className="w-1/2">
                                <h3 className="font-semibold mb-2 text-center">Objet Équipé</h3>
                                {equippedItem ? (
                                    <ItemTooltipContent item={equippedItem} />
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center mt-4">Aucun objet équipé dans cet emplacement.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
