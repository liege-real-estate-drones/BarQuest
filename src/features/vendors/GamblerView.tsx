// src/features/vendors/GamblerView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';

const itemSlots = ["weapon", "head", "chest", "legs", "hands", "feet", "belt", "amulet", "ring", "trinket", "offhand"];

export const GamblerView: React.FC = () => {
    const { gambleForItem, worldTier } = useGameStore(state => ({
        gambleForItem: state.gambleForItem,
        worldTier: state.worldTier,
    }));

    const cost = 100 * worldTier;

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold">Le Parieur</h2>
            <p className="text-sm text-muted-foreground mb-4">Tentez votre chance ! Le coût est de {cost} or.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {itemSlots.map(slot => (
                    <Button key={slot} onClick={() => gambleForItem(slot)} variant="outline">
                        {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </Button>
                ))}
            </div>
        </div>
    );
};
