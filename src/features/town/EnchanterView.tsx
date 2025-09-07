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
    const { getActiveHero, gameData, enchantItem } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
        enchantItem: state.enchantItem,
    }));

    const activeHero = getActiveHero();
    if (!activeHero) return <p>Aucun héros actif.</p>;
    const { inventory } = activeHero;

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
        if (!activeHero) return [];
        const { learnedRecipes, classeId } = activeHero.player;
        return gameData.enchantments.filter(enchantment => {
            const isLearned = learnedRecipes.includes(enchantment.id);
            if (!isLearned) return false;

            if (!enchantment.tagsClasse || enchantment.tagsClasse.length === 0) return true;
            if (!classeId) return true;

            return enchantment.tagsClasse.includes('common') || enchantment.tagsClasse.includes(classeId);
        });
    }, [gameData.enchantments, activeHero]);

    const enchantableItems = useMemo(() => {
        const equippedItems = Object.values(inventory.equipment).filter((item): item is Item => item !== null);
        const allItems = [...inventory.items, ...equippedItems];
        return allItems.filter(i => i.slot && i.rarity !== 'Légendaire' && i.type !== 'quest');
    }, [inventory.items, inventory.equipment]);

    const isEquipped = (itemId: string) => {
        return Object.values(inventory.equipment).some(equippedItem => equippedItem?.id === itemId);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Colonne d'inventaire */}
            <div className="md:col-span-1">
                <Card>
                    <CardHeader><CardTitle>Objets Enchantables</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[600px]">
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
                <Card className="h-full">
                    <CardHeader><CardTitle>Atelier d&apos;Enchantement</CardTitle></CardHeader>
                    <CardContent className="space-y-4 flex flex-col h-full">
                        {/* Selected Item */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Objet à Enchanter</h3>
                            {selectedItem ? <ItemTooltip item={selectedItem} /> : <p className="text-sm text-muted-foreground p-4 text-center border rounded">Sélectionnez un objet de votre inventaire.</p>}
                        </div>

                        {/* Enchantment Details & Comparison */}
                        {selectedItem && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Enchantement</h3>
                                    {selectedEnchantment ? (
                                        <div className="p-2 border rounded">
                                            <p className="font-semibold">{selectedEnchantment.name}</p>
                                            <p className="text-sm text-gray-400">{selectedEnchantment.description}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground p-4 text-center border rounded">Sélectionnez un enchantement ci-dessous.</p>
                                    )}
                                </div>

                                {currentEnchantmentAffix && selectedEnchantment && (
                                    <EnchantmentComparison
                                        currentAffix={currentEnchantmentAffix}
                                        newEnchantment={selectedEnchantment}
                                    />
                                )}
                            </>
                        )}
                        
                        {/* Available Enchantments List */}
                        {selectedItem && (
                            <>
                                <Separator />
                                <div className="flex-grow">
                                    <h3 className="text-lg font-semibold mb-2">Enchantements Disponibles</h3>
                                    <ScrollArea className="h-[250px] p-1">
                                        <div className="space-y-2">
                                            {learnedEnchantments.map(enchant => {
                                                const isAffordable = canAfford(enchant);
                                                return (
                                                    <div
                                                        key={enchant.id}
                                                        className={`p-3 border rounded cursor-pointer flex justify-between items-center ${selectedEnchantment?.id === enchant.id ? 'bg-purple-900/50 border-purple-500' : 'border-gray-700'}`}
                                                        onClick={() => setSelectedEnchantment(enchant)}
                                                    >
                                                        <div>
                                                            <p className="font-semibold">{enchant.name}</p>
                                                            <p className="text-sm text-gray-400">{enchant.description}</p>
                                                        </div>
                                                        <div className="text-right text-xs">
                                                            <p className={isAffordable ? 'text-green-400' : 'text-red-400'}>
                                                                {enchant.cost.map(c => `${c.amount} ${gameData.components?.find(m => m.id === c.id)?.name || c.id}`).join(', ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </>
                        )}
                        
                        {/* Action Button */}
                        <div className="mt-auto pt-4">
                            <Button onClick={handleEnchant} disabled={!selectedItem || !selectedEnchantment || !canAfford(selectedEnchantment!)} className="w-full">
                                Enchanter l&apos;objet
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

import { Separator } from '@/components/ui/separator';

// Component for the "Grimoire" tab
const GrimoireTab: React.FC = () => {
    const { getActiveHero, gameData } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
    }));

    const activeHero = getActiveHero();
    if (!activeHero) return <p>Aucun héros actif.</p>;
    const { player, inventory } = activeHero;
    const { learnedRecipes } = player;
    const { craftingMaterials: materials } = inventory;
    const { enchantments: allEnchantments, components } = gameData;

    const sortedEnchantments = useMemo(() => {
        return [...allEnchantments].sort((a, b) => (a.tier || 0) - (b.tier || 0) || (a.level || 0) - (b.level || 0));
    }, [allEnchantments]);

    const getComponentName = (componentId: string) => {
        return components.find(c => c.id === componentId)?.name || componentId;
    }

    return (
        <Card className="mt-4">
            <CardHeader><CardTitle>Grimoire des Enchantements</CardTitle></CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] p-1">
                    <div className="space-y-3">
                        {sortedEnchantments.map(enchant => {
                            const isLearned = learnedRecipes.includes(enchant.id);
                            return (
                                <Card key={enchant.id} className={isLearned ? 'border-yellow-400/50' : 'border-gray-700'}>
                                    <CardHeader className="p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className={`text-base ${isLearned ? 'text-yellow-400' : ''}`}>{enchant.name}</CardTitle>
                                                <p className="text-sm text-gray-400">{enchant.description}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0 pl-4">
                                                <p className={`text-sm font-semibold ${isLearned ? 'text-green-400' : 'text-red-400'}`}>
                                                    {isLearned ? 'Appris' : 'Non appris'}
                                                </p>
                                                <p className="text-xs text-gray-500">Palier {enchant.tier}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <Separator className="mb-3"/>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs font-semibold mb-1">Composants requis:</p>
                                                <ul className="list-disc list-inside text-xs text-gray-400">
                                                    {enchant.cost.map(c => (
                                                        <li key={c.id}>
                                                            {c.amount} x {getComponentName(c.id)}
                                                            <span className="text-gray-500"> (Vous avez {materials[c.id] || 0})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            {!isLearned && (
                                                <div>
                                                    <p className="text-xs font-semibold mb-1">Source:</p>
                                                    <p className="text-xs text-gray-400 capitalize">{(enchant.source || []).join(', ').replace(/_/g, ' ')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
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
