import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Item, Enchantment, Rareté } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

    const enchantableItems = useMemo(() => {
        const equippedItems = Object.values(inventory.equipment).filter((item): item is Item => item !== null);
        const allItems = [...inventory.items, ...equippedItems];
        return allItems.filter(i => i.slot && i.rarity !== 'Légendaire' && i.type !== 'quest');
    }, [inventory.items, inventory.equipment]);

    const isEquipped = (itemId: string) => {
        return Object.values(inventory.equipment).some(equippedItem => equippedItem?.id === itemId);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            {/* Colonne d'inventaire */}
            <div className="md:col-span-1">
                <Card>
                    <CardHeader><CardTitle>Objets Enchantables</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {enchantableItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`p-2 border rounded cursor-pointer relative ${selectedItem?.id === item.id ? 'bg-blue-900/50' : ''}`}
                                        onClick={() => { setSelectedItem(item); setSelectedEnchantment(null); }}
                                    >
                                        {isEquipped(item.id) && <span className="absolute top-1 right-1 text-xs bg-green-600 text-white px-1 rounded">Équipé</span>}
                                        <ItemTooltip item={item} />
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Colonne centrale "Workbench" */}
            <div className="md:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Atelier d&apos;Enchantement</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Objet à Enchanter</h3>
                            {selectedItem ? <ItemTooltip item={selectedItem} /> : <p className="text-sm text-muted-foreground">Sélectionnez un objet (non légendaire) de votre inventaire.</p>}
                        </div>
                        <hr className="border-gray-700"/>
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Enchantement Sélectionné</h3>
                            {selectedEnchantment ? (
                                <div>
                                    <p className="font-semibold">{selectedEnchantment.name}</p>
                                    <p className="text-sm text-gray-400">{selectedEnchantment.description}</p>
                                </div>
                            ) : <p className="text-sm text-muted-foreground">Sélectionnez un enchantement dans la liste de droite.</p>}
                        </div>

                        {currentEnchantmentAffix && selectedEnchantment && (
                            <EnchantmentComparison
                                currentAffix={currentEnchantmentAffix}
                                newEnchantment={selectedEnchantment}
                            />
                        )}

                        <Button onClick={handleEnchant} disabled={!selectedItem || !selectedEnchantment || !canAfford(selectedEnchantment!)} className="mt-4 w-full">
                            Enchanter l&apos;objet
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Colonne des enchantements */}
            <div className="md:col-span-1">
                 <Card>
                    <CardHeader><CardTitle>Enchantements Connus</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
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
                                                Coût: {enchant.cost.map(c => `${c.amount} ${gameData.components?.find(m => m.id === c.id)?.name || c.id}`).join(', ')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">Sélectionnez un objet pour voir les enchantements disponibles.</p>}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
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
                                    <div className="mt-2 pt-2 border-t border-gray-700 space-y-2">
                                        <div>
                                            <p className="text-xs font-semibold">Composants requis:</p>
                                            <ul className="list-disc list-inside text-xs text-gray-400">
                                                {enchant.cost.map(c => (
                                                    <li key={c.id}>
                                                        {c.amount} x {useGameStore.getState().gameData.components?.find(m => m.id === c.id)?.name || c.id}
                                                        <span className="text-gray-500"> (Vous avez {materials[c.id] || 0})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {!isLearned && (
                                            <div>
                                                <p className="text-xs font-semibold">Source:</p>
                                                <p className="text-xs text-gray-400 capitalize">{(enchant.source || []).join(', ').replace(/_/g, ' ')}</p>
                                            </div>
                                        )}
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
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="enchant">Enchanter</TabsTrigger>
                <TabsTrigger value="grimoire">Grimoire</TabsTrigger>
            </TabsList>
            <TabsContent value="enchant">
                <EnchantTab />
            </TabsContent>
            <TabsContent value="grimoire">
                <GrimoireTab />
            </TabsContent>
        </Tabs>
    );
};
