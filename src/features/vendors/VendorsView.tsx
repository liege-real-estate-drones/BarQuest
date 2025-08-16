
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { Rareté, Item } from '@/lib/types';
import { useGameStore, getItemSellPrice } from '@/state/gameStore';
import { Coins, ShoppingCart, Tags } from 'lucide-react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

function ItemPopoverContent({ item }: { item: Item }) {
    return (
        <div className="p-2 text-xs w-64">
            <h4 className={`font-bold ${rarityColorMap[item.rarity]}`}>{item.name}</h4>
            <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{item.slot}</span>
                <span>Niveau {item.niveauMin}</span>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
                {item.affixes.map((affix, i) => (
                    <p key={i} className="text-green-400">+{affix.val} {affix.ref}</p>
                ))}
            </div>
        </div>
    );
}

function BuyTab() {
    const { gold, gameItems, playerLevel, buyItem } = useGameStore(state => ({
        gold: state.inventory.gold,
        gameItems: state.gameData.items,
        playerLevel: state.player.level,
        buyItem: state.buyItem
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
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer">
                                        <span className={`${rarityColorMap[item.rarity]} underline decoration-dashed`}>{item.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <ItemPopoverContent item={item} />
                                </PopoverContent>
                            </Popover>
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
    const { inventoryItems, sellItem } = useGameStore(state => ({
        inventoryItems: state.inventory.items,
        sellItem: state.sellItem
    }));
     const { toast } = useToast();

    const handleSell = (item: Item) => {
        sellItem(item.id);
        toast({
            title: "Objet Vendu",
            description: `Vous avez vendu [${item.name}] pour ${getItemSellPrice(item)} or.`,
        });
    };
    
    if(inventoryItems.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Votre inventaire est vide.</p>
    }

    return (
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
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="cursor-pointer">
                                        <span className={`${rarityColorMap[item.rarity]} underline decoration-dashed`}>{item.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent>
                                    <ItemPopoverContent item={item} />
                                </PopoverContent>
                            </Popover>
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
    )
}

export function VendorsView() {
    const { gold } = useGameStore(state => ({
        gold: state.inventory.gold,
    }));
    
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Blacksmith</span>
                     <Badge variant="secondary" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {gold} Or
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-0">
                <Tabs defaultValue="buy" className="w-full flex-grow flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mx-6">
                        <TabsTrigger value="buy">Acheter</TabsTrigger>
                        <TabsTrigger value="sell">Vendre</TabsTrigger>
                    </TabsList>
                    <div className="relative flex-grow mt-4">
                        <ScrollArea className="absolute inset-0">
                            <TabsContent value="buy" className="m-0 px-6">
                                <BuyTab />
                            </TabsContent>
                            <TabsContent value="sell" className="m-0 px-6">
                                <SellTab />
                            </TabsContent>
                        </ScrollArea>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}
