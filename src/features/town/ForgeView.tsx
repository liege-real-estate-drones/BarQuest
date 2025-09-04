// src/features/town/ForgeView.tsx
import React, { useState } from 'react';
import { useGameStore, calculateItemScore } from '@/state/gameStore';
import type { Recipe, Item, Rareté, Stats } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemStat, STAT_ORDER, ItemTooltip } from '@/components/ItemTooltip';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { STAT_DISPLAY_NAMES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

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
    const { recipes, items: allItems, components } = useGameStore(state => state.gameData);
    const { getActiveHero, craftItem, equipItem } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        craftItem: state.craftItem,
        equipItem: state.equipItem,
    }));

    const activeHero = getActiveHero();
    if (!activeHero) return <p>Aucun héros actif.</p>;

    const { player, inventory } = activeHero;
    const { gold, craftingMaterials, items: inventoryItems, equipment } = inventory;
    const { toast } = useToast();

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [showEquipPrompt, setShowEquipPrompt] = useState<Item | null>(null);

    const getComparisonIndicator = (recipe: Recipe) => {
        if (!player.classeId) return null;

        const resultingItem = allItems.find(item => item.id === recipe.result);
        if (!resultingItem || !resultingItem.slot || resultingItem.slot === 'potion') return null;

        const equippedItem = equipment[resultingItem.slot as keyof typeof equipment];
        if (!equippedItem) {
            return <span className="text-green-400 font-bold mr-2">+</span>;
        }

        const newItemScore = calculateItemScore(resultingItem, player.classeId);
        const equippedItemScore = calculateItemScore(equippedItem, player.classeId);

        if (newItemScore > equippedItemScore) {
            return <span className="text-green-400 font-bold mr-2">+</span>;
        } else if (newItemScore < equippedItemScore) {
            return <span className="text-red-400 font-bold mr-2">-</span>;
        } else {
            return <span className="text-gray-500 font-bold mr-2">=</span>;
        }
    };

    const handleCraft = (recipeId: string) => {
        const result = craftItem(recipeId);
        if (result && 'error' in result) {
            toast({
                title: 'Échec de la fabrication',
                description: result.error,
                variant: 'destructive',
            });
        } else if (result) {
            toast({
                title: 'Objet fabriqué !',
                description: `Vous avez fabriqué: ${result.name}`,
            });
            setShowEquipPrompt(result);
        }
    };

    const getCraftingStatus = (recipe: Recipe) => {
        const resultingItem = allItems.find(item => item.id === recipe.result);
        const meetsLevelRequirement = resultingItem ? player.level >= resultingItem.niveauMin : true;
        const hasEnoughGold = gold >= recipe.cost;
        const missingMaterials: string[] = [];

        Object.entries(recipe.materials).forEach(([matId, requiredAmount]) => {
            if (matId.startsWith('item:')) {
                const baseId = matId.substring(5);
                const ownedCount = inventoryItems.filter(i => i.baseId === baseId).length;
                if (ownedCount < requiredAmount) missingMaterials.push(matId);
            } else {
                const ownedAmount = craftingMaterials[matId] || 0;
                if (ownedAmount < requiredAmount) missingMaterials.push(matId);
            }
        });

        const hasAllMaterials = missingMaterials.length === 0;
        const craftable = meetsLevelRequirement && hasEnoughGold && hasAllMaterials;

        return { craftable, meetsLevelRequirement, hasEnoughGold, missingMaterials };
    };

    const filteredRecipes = React.useMemo(() => {
        if (!player.classeId) return recipes;
        return recipes.filter(recipe => {
            const resultItem = allItems.find(item => item.id === recipe.result);
            if (!resultItem || !resultItem.tagsClasse) return true; // Show if no tags

            return resultItem.tagsClasse.includes('common') || (player.classeId && resultItem.tagsClasse.includes(player.classeId));
        });
    }, [recipes, allItems, player.classeId]);

    const getMaterialName = (materialId: string) => {
        if (materialId.startsWith('item:')) {
            const baseId = materialId.substring(5);
            const item = allItems.find(i => i.id === baseId);
            return item ? item.name : baseId;
        }
        const component = components.find(c => c.id === materialId);
        return component ? component.name : materialId;
    };

    const getResultingItem = (recipe: Recipe | null): Item | null => {
        if (!recipe) return null;
        return allItems.find(item => item.id === recipe.result) || null;
    };

    const resultingItem = getResultingItem(selectedRecipe);
    const equippedItem = resultingItem && resultingItem.slot ? equipment[resultingItem.slot as keyof typeof equipment] : null;

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


    const equippedItemForPrompt = showEquipPrompt ? equipment[showEquipPrompt.slot as keyof typeof equipment] : null;

    return (
        <>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Recettes de Forge</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-2">
                                {filteredRecipes.map(recipe => {
                                    const status = getCraftingStatus(recipe);
                                    const item = getResultingItem(recipe);
                                    return (
                                    <div
                                        key={recipe.id}
                                        className={cn(
                                            "p-2 border rounded cursor-pointer transition-colors",
                                            selectedRecipe?.id === recipe.id && "bg-slate-200 dark:bg-slate-700 border-slate-400",
                                            !status.craftable && "text-muted-foreground"
                                        )}
                                        onClick={() => setSelectedRecipe(recipe)}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                             <div className="flex items-center">
                                                {getComparisonIndicator(recipe)}
                                                <span className={cn(!status.craftable && "line-through")}>{recipe.name}</span>
                                             </div>
                                            <div className="flex items-center space-x-2 text-xs">
                                                {item && <span className={cn(status.meetsLevelRequirement ? 'text-green-400' : 'text-red-400')}>Lvl {item.niveauMin}</span>}
                                                {Object.entries(recipe.materials).map(([matId, required]) => (
                                                    <span key={matId} className={cn(status.missingMaterials.includes(matId) ? 'text-red-400' : 'text-green-400')}>
                                                        {required}x {getMaterialName(matId).split(' ').pop()}
                                                    </span>
                                                ))}
                                                <span className={cn(status.hasEnoughGold ? 'text-green-400' : 'text-red-400')}>{recipe.cost} Or</span>
                                            </div>
                                        </div>
                                    </div>
                                )})}
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
                                <div className={cn("grid gap-4", equippedItem ? "grid-cols-2" : "grid-cols-1")}>
                                    <div>
                                        <h4 className="font-bold text-lg">Objet à fabriquer</h4>
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
                                    {equippedItem && (
                                         <div>
                                            <h4 className="font-bold text-lg">Objet équipé</h4>
                                            <ItemTooltip item={equippedItem} />
                                         </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <h3 className="font-semibold">Matériaux Requis</h3>
                                        <ul className="list-disc list-inside text-sm">
                                            {Object.entries(selectedRecipe.materials).map(([matId, required]) => {
                                                const isItem = matId.startsWith('item:');
                                                const owned = isItem
                                                    ? inventoryItems.filter(i => i.baseId === matId.substring(5)).length
                                                    : craftingMaterials[matId] || 0;
                                                const hasEnough = owned >= required;
                                                return (
                                                    <li key={matId} className={hasEnough ? 'text-green-400' : 'text-red-400'}>
                                                        {getMaterialName(matId)}: {required} ({owned} possédés)
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Coût</h3>
                                        <p className={gold >= selectedRecipe.cost ? 'text-green-400' : 'text-red-400'}>
                                            {selectedRecipe.cost} Or ({gold} possédés)
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => handleCraft(selectedRecipe.id)}
                                        disabled={!getCraftingStatus(selectedRecipe).craftable}
                                        className="mt-2 w-full"
                                    >
                                        Fabriquer l&apos;objet
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
        {showEquipPrompt && (
            <AlertDialog open={!!showEquipPrompt} onOpenChange={(isOpen) => !isOpen && setShowEquipPrompt(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Équiper l&apos;objet fabriqué ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Choisissez quoi faire avec l’objet nouvellement fabriqué.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className={cn("grid gap-4 py-4", equippedItemForPrompt ? "grid-cols-2" : "grid-cols-1")}>
                        <div>
                            <h4 className="font-bold text-lg">Nouvel objet</h4>
                            <ItemTooltip item={showEquipPrompt} />
                        </div>
                        {equippedItemForPrompt && (
                                <div>
                                <h4 className="font-bold text-lg">Objet équipé</h4>
                                <ItemTooltip item={equippedItemForPrompt} />
                                </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowEquipPrompt(null)}>Garder</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            equipItem(showEquipPrompt.id);
                            setShowEquipPrompt(null);
                        }}>Équiper</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        </>
    );
};
