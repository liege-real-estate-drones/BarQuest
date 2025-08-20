// src/features/town/ForgeView.tsx
import React, { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Recipe, Item, Rareté, Stats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemStat, STAT_ORDER } from '@/components/ItemTooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { STAT_DISPLAY_NAMES } from '@/lib/constants';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Magique: 'text-blue-300',
    Rare: 'text-blue-500',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

type StatKey = keyof Omit<Stats, 'PV' | 'RessourceMax'>;

export const ForgeView: React.FC = () => {
    const { recipes, items: allItems } = useGameStore(state => state.gameData);
    const { gold, craftingMaterials } = useGameStore(state => state.inventory);
    const craftItem = useGameStore(state => state.craftItem);

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    const getResultingItem = (recipe: Recipe | null): Item | null => {
        if (!recipe) return null;
        return allItems.find(item => item.id === recipe.result) || null;
    };

    const canCraft = (recipe: Recipe): boolean => {
        if (gold < recipe.cost) {
            return false;
        }
        for (const matId in recipe.materials) {
            if ((craftingMaterials[matId] || 0) < recipe.materials[matId]) {
                return false;
            }
        }
        return true;
    };

    const resultingItem = getResultingItem(selectedRecipe);

    const itemAffixes = resultingItem ? [...(resultingItem.affixes || [])] : [];
    if (resultingItem?.stats) {
        Object.entries(resultingItem.stats).forEach(([key, val]) => {
             if (typeof val === 'number' && val && !itemAffixes.some(a => a.ref === key)) {
                 itemAffixes.push({ ref: key, val: val });
            }
        });
    }

    const allSortedAffixes = [...itemAffixes]
        .filter((affix, index, self) => index === self.findIndex(t => t.ref === affix.ref))
        .sort((a, b) => STAT_ORDER.indexOf(a.ref as StatKey) - STAT_ORDER.indexOf(b.ref as StatKey));


    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Recettes de Forge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {recipes.map(recipe => (
                                    <div
                                        key={recipe.id}
                                        className={`p-2 border rounded cursor-pointer ${selectedRecipe?.id === recipe.id ? 'bg-blue-200' : ''}`}
                                        onClick={() => setSelectedRecipe(recipe)}
                                    >
                                        {recipe.name}
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
                        <CardTitle>Détails de la Recette</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedRecipe && resultingItem ? (
                            <div className="space-y-4">
                                <div>
                                    <h4 className={cn("font-bold", rarityColorMap[resultingItem.rarity])}>{resultingItem.name}</h4>
                                    <div className="flex justify-between text-muted-foreground text-xs">
                                        <span className="capitalize">{resultingItem.slot}</span>
                                        <span>Niveau {resultingItem.niveauMin}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="space-y-1 text-xs">
                                        {allSortedAffixes.map((affix) => (
                                            <ItemStat
                                                key={affix.ref}
                                                label={STAT_DISPLAY_NAMES[affix.ref] || affix.ref}
                                                value={`${affix.val > 0 ? '+' : ''}${affix.val}`}
                                            />
                                        ))}
                                    </div>
                                    {resultingItem.set && (
                                        <>
                                            <Separator className="my-2" />
                                            <p className="text-yellow-300 text-xs">{resultingItem.set.name}</p>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <h3 className="font-semibold">Matériaux Requis</h3>
                                        <ul className="list-disc list-inside text-sm">
                                            {Object.entries(selectedRecipe.materials).map(([matId, required]) => {
                                                const owned = craftingMaterials[matId] || 0;
                                                const hasEnough = owned >= required;
                                                return (
                                                    <li key={matId} className={hasEnough ? 'text-green-600' : 'text-red-600'}>
                                                        {matId}: {required} ({owned} possédés)
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Coût</h3>
                                        <p className={gold >= selectedRecipe.cost ? 'text-green-600' : 'text-red-600'}>
                                            {selectedRecipe.cost} Or ({gold} possédés)
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => craftItem(selectedRecipe.id)}
                                        disabled={!canCraft(selectedRecipe)}
                                        className="mt-2 w-full"
                                    >
                                        Forger l&apos;objet
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p>Sélectionnez une recette pour voir les détails.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
