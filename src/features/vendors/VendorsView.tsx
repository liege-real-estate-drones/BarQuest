'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Item, Enchantment } from '@/lib/types';
import { useGameStore, getItemSellPrice, getItemBuyPrice, calculateItemScore, getRecipePrice } from '@/state/gameStore'; // Importez calculateItemScore
import { Coins, ShoppingCart, Tags, Trash2, Plus, Minus, Equal, BookUp } from 'lucide-react'; // Importez les icônes
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GamblerView } from './GamblerView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Ajoutez ce composant
const ComparisonIndicator = ({ comparison }: { comparison: 'better' | 'worse' | 'equal' }) => {
    if (comparison === 'better') {
        return <span className="text-green-500 flex items-center text-xs">[<Plus className="h-3 w-3" />]</span>;
    }
    if (comparison === 'worse') {
        return <span className="text-red-500 flex items-center text-xs">[<Minus className="h-3 w-3" />]</span>;
    }
    return <span className="text-gray-500 flex items-center text-xs">[<Equal className="h-3 w-3" />]</span>;
};


function BuyRecipesTab() {
    const { gold, enchantments, learnedRecipes, buyRecipe, playerLevel, playerReputation, factions } = useGameStore(state => ({
        gold: state.inventory.gold,
        enchantments: state.gameData.enchantments,
        learnedRecipes: state.player.learnedRecipes,
        buyRecipe: state.buyRecipe,
        playerLevel: state.player.level,
        playerReputation: state.player.reputation,
        factions: state.gameData.factions,
    }));
    const { toast } = useToast();

    const vendorRecipes = React.useMemo(() =>
        enchantments
        .filter(e => ((e.source || []).includes('trainer') || (e.source || []).includes('vendor')))
        .map(e => {
            const repReq = e.reputationRequirement;
            const price = getRecipePrice(e);
            const isLearned = learnedRecipes.includes(e.id);

            const hasRep = !repReq || (playerReputation[repReq.factionId]?.value || 0) >= repReq.threshold;
            const hasLevel = (e.level || 0) <= playerLevel;

            const canLearn = !isLearned && hasRep && hasLevel;

            let requirementText = '';
            if (isLearned) {
                // Already learned, no text needed, button will be disabled.
            } else {
                const requirements = [];
                if (!hasLevel) requirements.push(`Niveau ${e.level} requis`);
                if (!hasRep && repReq) {
                     const factionName = factions.find(f => f.id === repReq.factionId)?.name || repReq.factionId;
                     requirements.push(`Réputation "${repReq.rankName}" avec ${factionName} requise`);
                }
                requirementText = requirements.join('. ');
            }

            return {
                ...e,
                price,
                isLearned,
                hasRep,
                hasLevel,
                canLearn,
                requirementText,
            }
        })
        .sort((a,b) => (a.level || 0) - (b.level || 0)),
    [enchantments, playerLevel, learnedRecipes, playerReputation, gold, factions]);

    const handleBuyRecipe = (recipe: Enchantment & { price: number }) => {
        const success = buyRecipe(recipe.id);
        if (success) {
            toast({
                title: "Recette apprise !",
                description: `Vous avez appris [${recipe.name}].`,
            });
        } else {
            toast({
                title: "Échec de l'achat",
                description: "Vous n&apos;avez pas assez d&apos;or, de réputation, ou connaissez déjà cette recette.",
                variant: 'destructive'
            });
        }
    };

    if (vendorRecipes.length === 0) {
        return <p className="text-center text-muted-foreground p-8">L&apos;enchanteur n&apos;a aucune recette à vous apprendre pour le moment.</p>
    }

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Recette</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vendorRecipes.map(recipe => {
                        const repReq = recipe.reputationRequirement;
                        const factionName = repReq ? factions.find(f => f.id === repReq.factionId)?.name : '';

                        const repInfo = { rankName: '', currentRankName: '', currentRepValue: 0, nextRankThreshold: 'Max' };
                        if (repReq && factionName) {
                            const faction = factions.find(f => f.id === repReq.factionId);
                            if (faction) {
                                const sortedRanks = [...faction.ranks].sort((a, b) => a.threshold - b.threshold);
                                const requiredRank = sortedRanks.find(r => repReq.threshold === r.threshold);
                                if (requiredRank) repInfo.rankName = requiredRank.name;
                                repInfo.currentRepValue = playerReputation[repReq.factionId]?.value || 0;
                                const currentRank = sortedRanks.slice().reverse().find(r => repInfo.currentRepValue >= r.threshold);
                                repInfo.currentRankName = currentRank ? currentRank.name : 'Inconnu';
                                const nextRank = sortedRanks.find(r => repInfo.currentRepValue < r.threshold);
                                repInfo.nextRankThreshold = nextRank ? String(nextRank.threshold) : 'Max';
                            }
                        }

                        const rowContent = (
                             <TableRow key={recipe.id} className={!recipe.canLearn ? 'text-muted-foreground' : ''}>
                                <TableCell>
                                    <p className="font-medium">{recipe.name}</p>
                                    <p className="text-xs">{recipe.description}</p>
                                    {repReq && (
                                        <div className="text-xs mt-1 space-y-0.5">
                                            <p className={`${recipe.hasRep ? 'text-green-400' : 'text-red-400'}`}>
                                                Nécessite: {factionName} - {repInfo.rankName} ({repReq.threshold})
                                            </p>
                                            <p className="text-gray-400">
                                                Votre réputation: {repInfo.currentRankName} ({repInfo.currentRepValue} / {repInfo.nextRankThreshold})
                                            </p>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-primary">{recipe.price}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleBuyRecipe(recipe)} disabled={!recipe.canLearn}>
                                        <BookUp className="mr-2 h-4 w-4" /> Apprendre
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );

                        if (recipe.requirementText) {
                            return (
                                <Tooltip key={recipe.id} delayDuration={100}>
                                    <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
                                    <TooltipContent><p>{recipe.requirementText}</p></TooltipContent>
                                </Tooltip>
                            )
                        }

                        return rowContent;
                    })}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}

function BuyTab() {
    const { gold, gameItems, player, buyItem, equipment } = useGameStore(state => ({
        gold: state.inventory.gold,
        gameItems: state.gameData.items,
        player: state.player, // Récupérez l'objet player
        buyItem: state.buyItem,
        equipment: state.inventory.equipment,
    }));
    const { toast } = useToast();

    const vendorItems = React.useMemo(() =>
        gameItems
        .filter(item => item.slot && item.niveauMin <= player.level + 5 && !['potion', 'quest'].includes(item.slot))
        .map(item => ({
            ...item,
            vendorPrice: getItemBuyPrice(item),
        }))
        .sort((a,b) => a.niveauMin - b.niveauMin),
    [gameItems, player.level]);

    // Ajoutez cette fonction
    const getComparison = (item: Item) => {
        if (!player.classeId) return 'equal';

        const equippedItem = equipment[item.slot as keyof typeof equipment];
        const itemScore = calculateItemScore(item, player.classeId);
        const equippedScore = equippedItem ? calculateItemScore(equippedItem, player.classeId) : 0;

        if (itemScore > equippedScore) return 'better';
        if (itemScore < equippedScore) return 'worse';
        return 'equal';
    };

    const handleBuy = (item: Item) => {
        const success = buyItem(item.id); // On passe maintenant juste l'ID
        if (success) {
            toast({
                title: "Achat réussi !",
                description: `Vous avez acheté [${item.name}].`,
            });
        } else {
            toast({
                title: "Échec de l'achat",
                description: "Vous n'avez pas assez d'or.",
                variant: 'destructive'
            });
        }
    };

    if (vendorItems.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Le forgeron n&apos;a rien à vendre pour le moment.</p>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Objet</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {vendorItems.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <ComparisonIndicator comparison={getComparison(item)} />
                                <ItemTooltip item={item} equippedItem={equipment[item.slot as keyof typeof equipment]}>
                                    <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                </ItemTooltip>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">{item.vendorPrice}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleBuy(item)} disabled={gold < (item.vendorPrice || 0)}>
                                <ShoppingCart className="mr-2 h-4 w-4" /> Acheter
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function SellTab() {
    const { inventoryItems, sellItem, sellAllUnusedItems, equipment } = useGameStore(state => ({
        inventoryItems: state.inventory.items,
        sellItem: state.sellItem,
        sellAllUnusedItems: state.sellAllUnusedItems,
        equipment: state.inventory.equipment,
    }));
    const { toast } = useToast();

    const totalSellValue = React.useMemo(() =>
        inventoryItems.reduce((acc, item) => acc + getItemSellPrice(item), 0),
        [inventoryItems]
    );

    const handleSell = (item: Item) => {
        sellItem(item.id);
        toast({
            title: "Objet Vendu",
            description: `Vous avez vendu [${item.name}] pour ${getItemSellPrice(item)} or.`,
        });
    };

    const handleSellAll = () => {
        const { soldCount, goldGained } = sellAllUnusedItems();
        if (soldCount > 0) {
            toast({
                title: "Butin vendu !",
                description: `Vous avez vendu ${soldCount} objet(s) pour ${goldGained} or.`,
            });
        } else {
            toast({
                title: "Rien à vendre",
                description: "Vos sacs sont déjà vides.",
                variant: "destructive",
            });
        }
    };

    if(inventoryItems.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Votre inventaire est vide.</p>
    }

    return (
        <div>
            <div className="flex justify-end mb-4">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={inventoryItems.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Vendre tout le butin
                            {totalSellValue > 0 && (
                                <span className="ml-2 flex items-center gap-1">({totalSellValue} <Coins className="h-3 w-3" />)</span>
                            )}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr de vouloir tout vendre ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Vous êtes sur le point de vendre tous les objets non équipés de votre inventaire. Cette action est irréversible.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSellAll} className="bg-destructive hover:bg-destructive/90">
                                Oui, tout vendre
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Objet</TableHead>
                        <TableHead className="text-right">Valeur</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {inventoryItems.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <ItemTooltip item={item} equippedItem={equipment[item.slot as keyof typeof equipment]}>
                                     <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                </ItemTooltip>
                            </TableCell>
                            <TableCell className="text-right font-mono text-primary">{getItemSellPrice(item)}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => handleSell(item)}>
                                    <Tags className="mr-2 h-4 w-4" /> Vendre
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export function VendorsView() {
    const { gold } = useGameStore(state => ({
        gold: state.inventory.gold,
    }));

    return (
        // Le Card prendra toute la hauteur disponible de son parent flex
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Marchands</span>
                     <Badge variant="secondary" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {gold} Or
                    </Badge>
                </CardTitle>
            </CardHeader>
            {/* CardContent prend la hauteur restante, et son enfant direct aussi */}
            <CardContent className="flex-grow flex flex-col p-0 min-h-0">
                <Tabs defaultValue="buy" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-4 px-6">
                        <TabsTrigger value="buy">Acheter</TabsTrigger>
                        <TabsTrigger value="sell">Vendre</TabsTrigger>
                        <TabsTrigger value="recipes">Recettes</TabsTrigger>
                        <TabsTrigger value="gamble">Parier</TabsTrigger>
                    </TabsList>
                    {/* Ce conteneur a maintenant une hauteur définie (le reste de l'espace) */}
                    <div className="relative flex-grow mt-4">
                        <ScrollArea className="absolute inset-0">
                            <div className="px-6">
                                <TabsContent value="buy" className="m-0">
                                    <BuyTab />
                                </TabsContent>
                                <TabsContent value="sell" className="m-0">
                                    <SellTab />
                                </TabsContent>
                                <TabsContent value="recipes" className="m-0">
                                    <BuyRecipesTab />
                                </TabsContent>
                                <TabsContent value="gamble" className="m-0">
                                    <GamblerView />
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}