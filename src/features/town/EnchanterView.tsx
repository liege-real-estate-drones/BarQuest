// src/features/town/EnchanterView.tsx
import React, { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Item, Enchantment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';

export const EnchanterView: React.FC = () => {
    const { inventory, gameData, enchantItem } = useGameStore(state => ({
        inventory: state.inventory,
        gameData: state.gameData,
        enchantItem: state.enchantItem,
    }));

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedEnchantment, setSelectedEnchantment] = useState<Enchantment | null>(null);

    const handleEnchant = () => {
        if (selectedItem && selectedEnchantment) {
            enchantItem(selectedItem.id, selectedEnchantment.id);
            // The item state will update automatically, which should re-render the tooltip
        }
    };

    const canAfford = (enchantment: Enchantment) => {
        for (const cost of enchantment.cost) {
            if ((inventory.craftingMaterials[cost.id] || 0) < cost.amount) {
                return false;
            }
        }
        return true;
    };

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader><CardTitle>Inventaire</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {inventory.items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`p-2 border rounded cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-900/50' : ''}`}
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setSelectedEnchantment(null);
                                        }}
                                    >
                                        <ItemTooltip item={item} />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            <div className="md:col-span-2 grid grid-rows-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Objet à Enchanter</CardTitle></CardHeader>
                    <CardContent>
                        {selectedItem ? (
                            <ItemTooltip item={selectedItem} />
                        ) : (
                            <p>Sélectionnez un objet de votre inventaire.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Enchantements Disponibles</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            {selectedItem ? (
                                <div className="space-y-2">
                                    {gameData.enchantments.map(enchant => (
                                        <div
                                            key={enchant.id}
                                            className={`p-2 border rounded cursor-pointer ${selectedEnchantment?.id === enchant.id ? 'bg-purple-900/50' : ''}`}
                                            onClick={() => setSelectedEnchantment(enchant)}
                                        >
                                            <p className="font-semibold">{enchant.name}</p>
                                            <p className="text-sm text-gray-400">{enchant.description}</p>
                                            <p className={`text-xs ${canAfford(enchant) ? 'text-green-400' : 'text-red-400'}`}>
                                                Coût: {enchant.cost.map(c => `${c.amount} ${c.id}`).join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>Sélectionnez un objet pour voir les enchantements.</p>
                            )}
                        </ScrollArea>
                        <Button onClick={handleEnchant} disabled={!selectedItem || !selectedEnchantment || !canAfford(selectedEnchantment!)} className="mt-4 w-full">
                            Enchanter l'objet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
