import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Item, Enchantment, Rareté } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EnchantmentComparison } from './components/EnchantmentComparison';

// Component for the main "Enchant" tab
const EnchantTab: React.FC = () => {
    const { inventory, gameData, enchantItem } = useGameStore(state => ({
        inventory: state.inventory,
        gameData: state.gameData,
        enchantItem: state.enchantItem,
    }));

    type SimpleAffix = { ref: string; val: number; isEnchantment?: boolean };

    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [selectedEnchantment, setSelectedEnchantment] = useState<Enchantment | null>(null);
    const [currentEnchantmentAffix, setCurrentEnchantmentAffix] = useState<SimpleAffix | null>(null);

    useEffect(() => {
        if (selectedItem) {
            const existingEnchantment = selectedItem.affixes?.find(a => a.isEnchantment);
            setCurrentEnchantmentAffix(existingEnchantment || null);
        } else {
            setCurrentEnchantmentAffix(null);
        }
    }, [selectedItem]);

    const handleEnchant = () => {
        if (selectedItem && selectedEnchantment) {
            enchantItem(selectedItem.id, selectedEnchantment.id);
            setSelectedItem(null);
            setSelectedEnchantment(null);
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

    const learnedEnchantments = useMemo(() => {
        return gameData.enchantments.filter(e => useGameStore.getState().player.learnedRecipes.includes(e.id));
    }, [gameData.enchantments]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader><CardTitle>Inventaire</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {inventory.items.filter(i => i.slot && i.rarity !== 'Légendaire').map(item => (
                                    <div
                                        key={item.id}
                                        className={`p-2 border rounded cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-900/50' : ''}`}
                                        onClick={() => { setSelectedItem(item); setSelectedEnchantment(null); }}
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
                        {selectedItem ? <ItemTooltip item={selectedItem} /> : <p>Sélectionnez un objet (non légendaire) de votre inventaire.</p>}
                        {currentEnchantmentAffix && selectedEnchantment && (
                            <EnchantmentComparison
                                currentAffix={currentEnchantmentAffix}
                                newEnchantment={selectedEnchantment}
                            />
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Enchantements Connus</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[200px]">
                            {selectedItem ? (
                                <div className="space-y-2">
                                    {learnedEnchantments.map(enchant => (
                                        <div
                                            key={enchant.id}
                                            className={`p-2 border rounded cursor-pointer ${selectedEnchantment?.id === enchant.id ? 'bg-purple-900/50' : ''}`}
                                            onClick={() => setSelectedEnchantment(enchant)}
                                        >
                                            <p className="font-semibold">{enchant.name}</p>
                                            <p className="text-sm text-gray-400">{enchant.description}</p>
                                            <p className={`text-xs ${canAfford(enchant) ? 'text-green-400' : 'text-red-400'}`}>
                                                Coût: {enchant.cost.map(c => `${c.amount} ${gameData.enchanting_components?.find(m => m.id === c.id)?.name || c.id}`).join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : <p>Sélectionnez un objet pour voir les enchantements.</p>}
                        </ScrollArea>
                        <Button onClick={handleEnchant} disabled={!selectedItem || !selectedEnchantment || !canAfford(selectedEnchantment!)} className="mt-4 w-full">
                            Enchanter l&apos;objet
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// Component for the "Dismantle" tab (moved from CraftingView)
const DismantleTab: React.FC = () => {
    const { inventory, dismantleItem } = useGameStore(state => ({
        inventory: state.inventory,
        dismantleItem: state.dismantleItem,
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
                                            className={`p-2 border rounded cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-900/50' : ''}`}
                                            onClick={() => setSelectedItem(item)}
                                        >
                                           <ItemTooltip item={item} />
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
                            <CardTitle>Objet à Démanteler</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedItem ? (
                                <div className="space-y-4">
                                    <ItemTooltip item={selectedItem} />
                                    <Button onClick={handleDismantleClick} variant="destructive" className="mt-4 w-full">Démanteler</Button>
                                </div>
                            ) : (
                                <p>Sélectionnez un objet de votre inventaire à démanteler.</p>
                            )}
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

// Component for the "Grimoire" tab
const GrimoireTab: React.FC = () => {
    const { allEnchantments, learnedRecipes, materials } = useGameStore(state => ({
        allEnchantments: state.gameData.enchantments,
        learnedRecipes: state.player.learnedRecipes,
        materials: state.inventory.craftingMaterials,
    }));

    const sortedEnchantments = useMemo(() => {
        return [...allEnchantments].sort((a, b) => (a.tier || 0) - (b.tier || 0) || (a.level || 0) - (b.level || 0));
    }, [allEnchantments]);

    return (
        <Card className="mt-4">
            <CardHeader><CardTitle>Grimoire des Enchantements</CardTitle></CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                        {sortedEnchantments.map(enchant => {
                            const isLearned = learnedRecipes.includes(enchant.id);
                            return (
                                <div key={enchant.id} className={`p-3 border rounded ${isLearned ? 'border-yellow-400/50' : 'border-gray-700'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-bold ${isLearned ? 'text-yellow-400' : ''}`}>{enchant.name}</p>
                                            <p className="text-sm text-gray-400">{enchant.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-semibold ${isLearned ? 'text-green-400' : 'text-red-400'}`}>
                                                {isLearned ? 'Appris' : 'Non appris'}
                                            </p>
                                            <p className="text-xs text-gray-500">Palier {enchant.tier}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-700">
                                        <p className="text-xs font-semibold">Composants requis:</p>
                                        <ul className="list-disc list-inside text-xs text-gray-400">
                                            {enchant.cost.map(c => (
                                                <li key={c.id}>
                                                    {c.amount} x {useGameStore.getState().gameData.enchanting_components?.find(m => m.id === c.id)?.name || c.id}
                                                    <span className="text-gray-500"> (Vous avez {materials[c.id] || 0})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};


export const EnchanterView: React.FC = () => {
    return (
        <Tabs defaultValue="enchant" className="p-4">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="enchant">Enchanter</TabsTrigger>
                <TabsTrigger value="grimoire">Grimoire</TabsTrigger>
                <TabsTrigger value="dismantle">Démanteler</TabsTrigger>
            </TabsList>
            <TabsContent value="enchant">
                <EnchantTab />
            </TabsContent>
            <TabsContent value="grimoire">
                <GrimoireTab />
            </TabsContent>
            <TabsContent value="dismantle">
                <DismantleTab />
            </TabsContent>
        </Tabs>
    );
};
