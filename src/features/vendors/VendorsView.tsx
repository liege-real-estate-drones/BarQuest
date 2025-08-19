// liege-real-estate-drones/barquest/BarQuest-ba29103e759395544a0519632ae86dfb86dc7427/src/features/vendors/VendorsView.tsx
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Item } from '@/lib/types';
import { useGameStore, getItemSellPrice } from '@/state/gameStore';
import { Coins, ShoppingCart, Tags, Trash2 } from 'lucide-react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function BuyTab() {
    const { gold, gameItems, playerLevel, buyItem, equipment } = useGameStore(state => ({
        gold: state.inventory.gold,
        gameItems: state.gameData.items,
        playerLevel: state.player.level,
        buyItem: state.buyItem,
        equipment: state.inventory.equipment,
    }));
    const { toast } = useToast();

    const vendorItems = React.useMemo(() =>
        gameItems.filter(item =>
            item.vendorPrice && item.vendorPrice > 0 && item.niveauMin <= playerLevel + 5
        ).sort((a,b) => a.niveauMin - b.niveauMin),
    [gameItems, playerLevel]);

    const handleBuy = (item: Item) => {
        const success = buyItem(item);
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
        return <p className="text-center text-muted-foreground p-8">Le forgeron n'a rien à vendre pour le moment.</p>
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
                            <ItemTooltip item={item} equippedItem={equipment[item.slot as keyof typeof equipment]}>
                                <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                            </ItemTooltip>
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
                    <span>Forgeron</span>
                     <Badge variant="secondary" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {gold} Or
                    </Badge>
                </CardTitle>
            </CardHeader>
            {/* CardContent prend la hauteur restante, et son enfant direct aussi */}
            <CardContent className="flex-grow flex flex-col p-0 min-h-0">
                <Tabs defaultValue="buy" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 px-6">
                        <TabsTrigger value="buy">Acheter</TabsTrigger>
                        <TabsTrigger value="sell">Vendre</TabsTrigger>
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
                            </div>
                        </ScrollArea>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}