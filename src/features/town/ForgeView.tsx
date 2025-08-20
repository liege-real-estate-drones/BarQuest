// src/features/town/ForgeView.tsx
import React, { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import type { Recipe } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';

export const ForgeView: React.FC = () => {
    const { recipes, items: allItems } = useGameStore(state => state.gameData);
    const { gold, craftingMaterials } = useGameStore(state => state.inventory);
    const craftItem = useGameStore(state => state.craftItem);

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    const getResultingItem = (recipe: Recipe | null) => {
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
                                <ItemTooltip item={resultingItem} />
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
                                        Forger l'objet
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
