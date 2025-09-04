'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Item, Enchantment } from '@/lib/types';
import { useGameStore, getItemSellPrice, getItemBuyPrice, calculateItemScore, getRecipePrice } from '@/state/gameStore';
import { Coins, ShoppingCart, Tags, Trash2, Plus, Minus, Equal, BookUp, Edit } from 'lucide-react';
import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { isValidName } from '@/lib/utils';
import { RENAME_COST } from '@/lib/constants';

const ComparisonIndicator = ({ comparison }: { comparison: 'better' | 'worse' | 'equal' }) => {
    if (comparison === 'better') {
        return <span className="text-green-500 flex items-center text-xs">[<Plus className="h-3 w-3" />]</span>;
    }
    if (comparison === 'worse') {
        return <span className="text-red-500 flex items-center text-xs">[<Minus className="h-3 w-3" />]</span>;
    }
    return <span className="text-gray-500 flex items-center text-xs">[<Equal className="h-3 w-3" />]</span>;
};

function SpecialServicesTab() {
    const { toast } = useToast();
    const { renameActiveHero, getActiveHero } = useGameStore(state => ({
        renameActiveHero: state.renameActiveHero,
        getActiveHero: state.getActiveHero,
    }));
    const [newName, setNewName] = useState('');

    const activeHero = getActiveHero();
    if (!activeHero) return null;

    const handleRename = () => {
        if (!isValidName(newName)) {
            toast({
                title: "Nom invalide",
                description: "Le nom doit contenir entre 3 et 16 caractères et ne peut être composé que de lettres et de chiffres.",
                variant: "destructive",
            });
            return;
        }

        const success = renameActiveHero(newName);

        if (success) {
            toast({
                title: "Renommage réussi !",
                description: `Votre personnage s'appelle désormais ${newName}.`,
            });
            setNewName('');
        } else {
            toast({
                title: "Échec du renommage",
                description: `Vous n'avez pas assez d'or (${RENAME_COST}) ou une erreur est survenue.`,
                variant: "destructive",
            });
        }
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Changement de nom</h3>
            <p className="text-sm text-muted-foreground">
                Changez le nom de votre héros pour la modique somme de {RENAME_COST} pièces d'or.
            </p>
            <div className="flex w-full max-w-sm items-center space-x-2">
                <Input
                    type="text"
                    placeholder={activeHero.player.name}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={16}
                />
                <Button onClick={handleRename} disabled={newName.length < 3 || activeHero.inventory.gold < RENAME_COST}>
                    <Edit className="mr-2 h-4 w-4" /> Changer de nom ({RENAME_COST} or)
                </Button>
            </div>
        </div>
    );
}


function BuyRecipesTab() {
    const { getActiveHero, gameData, buyRecipe } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
        buyRecipe: state.buyRecipe,
    }));
    const { toast } = useToast();

    const activeHero = getActiveHero();
    if (!activeHero) return null;
    const { player, inventory } = activeHero;

    const vendorRecipes = React.useMemo(() =>
        gameData.enchantments
        .filter(e => ((e.source || []).includes('trainer') || (e.source || []).includes('vendor')))
        .filter(e => !e.tagsClasse || e.tagsClasse.includes('common') || (player.classeId && e.tagsClasse.includes(player.classeId)))
        .map(e => {
            const repReq = e.reputationRequirement;
            const price = getRecipePrice(e);
            const isLearned = player.learnedRecipes.includes(e.id);
            const hasRep = !repReq || (player.reputation[repReq.factionId]?.value || 0) >= repReq.threshold;
            const hasLevel = (e.level || 0) <= player.level;
            const canLearn = !isLearned && hasRep && hasLevel;
            let requirementText = '';
            if (!isLearned) {
                const requirements = [];
                if (!hasLevel) requirements.push(`Niveau ${e.level} requis`);
                if (!hasRep && repReq) {
                    const factionName = gameData.factions.find(f => f.id === repReq.factionId)?.name || repReq.factionId;
                    const faction = gameData.factions.find(f => f.id === repReq.factionId);
                    const rankName = faction?.ranks.find(r => r.threshold === repReq.threshold)?.name || 'Unknown Rank';
                    requirements.push(`Réputation "${rankName}" avec ${factionName} requise`);
                }
                requirementText = requirements.join('. ');
            }
            return { ...e, price, isLearned, hasRep, hasLevel, canLearn, requirementText };
        })
        .sort((a,b) => (a.level || 0) - (b.level || 0)),
    [gameData, player, inventory.gold]);

    const handleBuyRecipe = (recipe: Enchantment & { price: number }) => {
        const success = buyRecipe(recipe.id);
        if (success) {
            toast({ title: "Recette apprise !", description: `Vous avez appris [${recipe.name}].` });
        } else {
            toast({ title: "Échec de l'achat", description: "Vous n'avez pas assez d'or, de réputation, ou connaissez déjà cette recette.", variant: 'destructive' });
        }
    };

    if (vendorRecipes.length === 0) return <p className="text-center text-muted-foreground p-8">L'enchanteur n'a aucune recette à vous apprendre.</p>;

    return (
        <TooltipProvider>
            <Table>
                <TableHeader><TableRow><TableHead>Recette</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="w-[120px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                    {vendorRecipes.map(recipe => {
                        // ... (rest of the component is the same, no need to repeat)
                        return (
                             <TableRow key={recipe.id} className={!recipe.canLearn ? 'text-muted-foreground' : ''}>
                                <TableCell>
                                    <p className="font-medium">{recipe.name}</p>
                                    <p className="text-xs">{recipe.description}</p>
                                </TableCell>
                                <TableCell className="text-right font-mono text-primary">{Math.round(recipe.price)}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => handleBuyRecipe(recipe)} disabled={!recipe.canLearn}>
                                        <BookUp className="mr-2 h-4 w-4" /> Apprendre
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
}

function BuyTab() {
    const { getActiveHero, gameData, buyItem } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        gameData: state.gameData,
        buyItem: state.buyItem,
    }));
    const { toast } = useToast();

    const activeHero = getActiveHero();
    if (!activeHero) return null;
    const { player, inventory } = activeHero;

    const vendorItems = React.useMemo(() =>
        gameData.items
        .filter(item => item.slot && item.niveauMin <= player.level + 5 && !['potion', 'quest'].includes(item.slot))
        .map(item => ({ ...item, vendorPrice: getItemBuyPrice(item) }))
        .sort((a,b) => a.niveauMin - b.niveauMin),
    [gameData.items, player.level]);

    const getComparison = (item: Item) => {
        if (!player.classeId) return 'equal';
        const equippedItem = inventory.equipment[item.slot as keyof typeof inventory.equipment];
        const itemScore = calculateItemScore(item, player.classeId);
        const equippedScore = equippedItem ? calculateItemScore(equippedItem, player.classeId) : 0;
        if (itemScore > equippedScore) return 'better';
        if (itemScore < equippedScore) return 'worse';
        return 'equal';
    };

    const handleBuy = (item: Item) => {
        const success = buyItem(item.id);
        if (success) {
            toast({ title: "Achat réussi !", description: `Vous avez acheté [${item.name}].` });
        } else {
            toast({ title: "Échec de l'achat", description: "Vous n'avez pas assez d'or.", variant: 'destructive' });
        }
    };

    if (vendorItems.length === 0) return <p className="text-center text-muted-foreground p-8">Le forgeron n'a rien à vendre.</p>;

    return (
        <Table>
            <TableHeader><TableRow><TableHead>Objet</TableHead><TableHead className="text-right">Prix</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
            <TableBody>
                {vendorItems.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <ComparisonIndicator comparison={getComparison(item)} />
                                <ItemTooltip item={item} equippedItem={inventory.equipment[item.slot as keyof typeof inventory.equipment]}>
                                    <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                </ItemTooltip>
                            </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">{item.vendorPrice}</TableCell>
                        <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleBuy(item)} disabled={inventory.gold < (item.vendorPrice || 0)}>
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
    const { getActiveHero, sellItem, sellAllUnusedItems } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
        sellItem: state.sellItem,
        sellAllUnusedItems: state.sellAllUnusedItems,
    }));
    const { toast } = useToast();

    const activeHero = getActiveHero();
    if (!activeHero) return null;
    const { inventory } = activeHero;

    const totalSellValue = React.useMemo(() =>
        inventory.items.reduce((acc, item) => acc + getItemSellPrice(item), 0),
        [inventory.items]
    );

    const handleSell = (item: Item) => {
        sellItem(item.id);
        toast({ title: "Objet Vendu", description: `Vous avez vendu [${item.name}] pour ${getItemSellPrice(item)} or.` });
    };

    const handleSellAll = () => {
        const { soldCount, goldGained } = sellAllUnusedItems();
        if (soldCount > 0) {
            toast({ title: "Butin vendu !", description: `Vous avez vendu ${soldCount} objet(s) pour ${goldGained} or.` });
        } else {
            toast({ title: "Rien à vendre", description: "Vos sacs sont déjà vides.", variant: "destructive" });
        }
    };

    if(inventory.items.length === 0) return <p className="text-center text-muted-foreground p-8">Votre inventaire est vide.</p>;

    return (
        <div>
            <div className="flex justify-end mb-4">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive" disabled={inventory.items.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> Vendre tout le butin
                            {totalSellValue > 0 && (<span className="ml-2 flex items-center gap-1">({totalSellValue} <Coins className="h-3 w-3" />)</span>)}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Êtes-vous sûr de vouloir tout vendre ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleSellAll} className="bg-destructive hover:bg-destructive/90">Oui, tout vendre</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
             <Table>
                <TableHeader><TableRow><TableHead>Objet</TableHead><TableHead className="text-right">Valeur</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                    {inventory.items.map(item => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <ItemTooltip item={item} equippedItem={inventory.equipment[item.slot as keyof typeof inventory.equipment]}>
                                     <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                </ItemTooltip>
                            </TableCell>
                            <TableCell className="text-right font-mono text-primary">{getItemSellPrice(item)}</TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" variant="outline" onClick={() => handleSell(item)}><Tags className="mr-2 h-4 w-4" /> Vendre</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export function VendorsView() {
    const { getActiveHero } = useGameStore(state => ({
        getActiveHero: state.getActiveHero,
    }));

    const activeHero = getActiveHero();
    const gold = activeHero?.inventory.gold ?? 0;

    return (
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
            <CardContent className="flex-grow flex flex-col p-0 min-h-0">
                <Tabs defaultValue="buy" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-5 px-6">
                        <TabsTrigger value="buy">Acheter</TabsTrigger>
                        <TabsTrigger value="sell">Vendre</TabsTrigger>
                        <TabsTrigger value="recipes">Recettes</TabsTrigger>
                        <TabsTrigger value="gamble">Parier</TabsTrigger>
                        <TabsTrigger value="services">Services</TabsTrigger>
                    </TabsList>
                    <div className="relative flex-grow mt-4">
                        <ScrollArea className="absolute inset-0">
                            <div className="px-6">
                                <TabsContent value="buy" className="m-0"><BuyTab /></TabsContent>
                                <TabsContent value="sell" className="m-0"><SellTab /></TabsContent>
                                <TabsContent value="recipes" className="m-0"><BuyRecipesTab /></TabsContent>
                                <TabsContent value="gamble" className="m-0"><GamblerView /></TabsContent>
                                <TabsContent value="services" className="m-0"><SpecialServicesTab /></TabsContent>
                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}