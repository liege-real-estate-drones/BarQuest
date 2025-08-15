
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import type { Rareté, Item } from '@/lib/types';
import { useGameStore } from '@/state/gameStore';
import { Coins, ShoppingCart } from 'lucide-react';
import React from 'react';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

function ItemTooltipContent({ item }: { item: Item }) {
    return (
        <div className="p-2 border rounded bg-background shadow-lg text-xs w-64 z-50">
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

export function VendorsView() {
    const { gold, items, buyItem } = useGameStore(state => ({
        gold: state.inventory.gold,
        items: state.gameData.items,
        buyItem: state.buyItem
    }));
    const { toast } = useToast();

    const vendorItems = React.useMemo(() => items.filter(item => item.vendorPrice && item.vendorPrice > 0), [items]);

    const handleBuy = (item: Item) => {
        const success = buyItem(item);
        if (success) {
            toast({
                title: "Achat réussi !",
                description: `Vous avez acheté [${item.name}].`,
                className: 'bg-green-700 border-green-600 text-white'
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
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Blacksmith</span>
                     <Badge variant="secondary" className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        {gold} Or
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <TooltipProvider delayDuration={100}>
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
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="cursor-default">
                                                    <span className={`${rarityColorMap[item.rarity]}`}>{item.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">(iLvl {item.niveauMin})</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <ItemTooltipContent item={item} />
                                            </TooltipContent>
                                        </Tooltip>
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
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}

    