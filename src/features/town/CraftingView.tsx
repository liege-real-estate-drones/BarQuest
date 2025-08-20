// src/features/town/CraftingView.tsx
import React, { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Item } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Rareté } from '@/lib/types';

const getRarityMultiplier = (rarity: Rareté): number => {
    const rarityMultiplier = { "Commun": 1, "Rare": 2, "Épique": 3, "Légendaire": 5, "Unique": 5 };
    return rarityMultiplier[rarity] || 1;
};

export const CraftingView: React.FC = () => {
    const { inventory, dismantleItem, enchantItem } = useGameStore(state => ({
        inventory: state.inventory,
        dismantleItem: state.dismantleItem,
        enchantItem: state.enchantItem,
    }));

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const isEquipped = (itemId: string) => {
        return Object.values(inventory.equipment).some(equippedItem => equippedItem?.id === itemId);
    };

    const handleDismantleClick = () => {
        if (!selectedItem) return;
        if (isEquipped(selectedItem.id)) {
            setIsAlertOpen(true);
        } else {
            handleDismantleConfirm();
        }
    };

    const handleDismantleConfirm = () => {
        if (selectedItem) {
            dismantleItem(selectedItem.id);
            setSelectedItem(null);
        }
        setIsAlertOpen(false);
    };

    const handleEnchant = () => {
        if (selectedItem) {
            enchantItem(selectedItem.id);
            // The item state will update automatically via Zustand
        }
    };

    return (
        <>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventaire</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px]">
                                <div className="space-y-2">
                                    {inventory.items.map(item => (
                                        <div
                                            key={item.id}
                                            className={`p-2 border rounded cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-200' : ''}`}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            {item.name}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions d'artisanat</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedItem ? (
                                <div className="space-y-4">
                                    <ItemTooltip item={selectedItem} />
                                    <div className="space-y-2">
                                        <div>
                                            <h3 className="font-semibold">Démanteler</h3>
                                            <p className="text-sm text-gray-500">Gain: 1-{getRarityMultiplier(selectedItem.rarity)} scrap_metal | Possédés: {inventory.craftingMaterials['scrap_metal'] || 0}</p>
                                            <Button onClick={handleDismantleClick} variant="destructive" className="mt-1">Démanteler</Button>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Enchanter</h3>
                                            {/* TODO: Make enchant cost dynamic */}
                                            <p className="text-sm text-gray-500">Requis: 5 scrap_metal | Possédés: {inventory.craftingMaterials['scrap_metal'] || 0}</p>
                                            <Button onClick={handleEnchant} className="mt-1 bg-purple-500 hover:bg-purple-600">Enchanter</Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p>Sélectionnez un objet de votre inventaire pour voir les actions disponibles.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="mt-4">
                         <CardHeader>
                            <CardTitle>Matériaux</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul>
                                {Object.entries(inventory.craftingMaterials).map(([materialId, count]) => (
                                    <li key={materialId}>{materialId}: {count}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cet objet est actuellement équipé. Le démanteler le retirera de votre équipement de manière permanente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDismantleConfirm}>Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
