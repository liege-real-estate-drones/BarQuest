'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Coins, Star, Swords } from 'lucide-react';
import { Item } from '@/data/schemas';

export function DungeonCompletionView() {
    const { summary, closeSummary } = useGameStore(state => ({
        summary: state.dungeonCompletionSummary,
        closeSummary: state.closeDungeonSummary,
    }));

    if (!summary) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Erreur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Aucun résumé de donjon disponible.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={closeSummary} className="w-full">Retourner en ville</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-24 bg-background/80 backdrop-blur-sm">
            <Card className="w-full max-w-2xl animate-in fade-in-50 zoom-in-95">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Donjon Terminé !</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* XP and Gold */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 bg-primary/10 rounded-lg">
                            <Star className="mx-auto h-8 w-8 text-yellow-400 mb-2" />
                            <p className="text-xl font-bold">{summary.xpGained.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Expérience gagnée</p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-lg">
                            <Coins className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                            <p className="text-xl font-bold">{summary.goldGained.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Or trouvé</p>
                        </div>
                    </div>

                    {/* Items Found */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 flex items-center"><Swords className="h-5 w-5 mr-2" />Butin Obtenu</h3>
                        <div className="p-4 border rounded-lg min-h-[80px]">
                            {summary.itemsGained.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {summary.itemsGained.map((item: Item, index: number) => (
                                        <ItemTooltip key={`${item.id}-${index}`} item={item} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Aucun objet trouvé.</p>
                            )}
                        </div>
                    </div>
                    {/* Chest Content */}
                    {summary.chestRewards && (summary.chestRewards.gold > 0 || summary.chestRewards.items.length > 0) && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center">
                                <img src="/images/icons/chest.png" alt="Chest" className="h-6 w-6 mr-2" />
                                Contenu du Coffre
                            </h3>
                            <div className="p-4 border bg-primary/5 rounded-lg space-y-4">
                                <div className="flex items-center justify-center text-center">
                                    <Coins className="h-6 w-6 text-yellow-500 mr-2" />
                                    <p className="text-lg font-bold">{summary.chestRewards.gold.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground ml-1">Or supplémentaire</p>
                                </div>
                                {summary.chestRewards.items.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4 border-t">
                                        {summary.chestRewards.items.map((item: Item, index: number) => (
                                            <ItemTooltip key={`${item.id}-${index}`} item={item} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={closeSummary} className="w-full text-lg py-6">
                        Retourner en ville
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
