'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Coins, Star, Swords, Sparkles } from 'lucide-react';

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
                            <p className="text-xl font-bold">{summary.experience.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Expérience gagnée</p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-lg">
                            <Coins className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                            <p className="text-xl font-bold">{summary.gold.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Or trouvé</p>
                        </div>
                    </div>

                    {/* Items Found */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2 flex items-center"><Swords className="h-5 w-5 mr-2" />Butin Obtenu</h3>
                        <div className="p-4 border rounded-lg min-h-[80px]">
                            {summary.items.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {summary.items.map((item, index) => (
                                        <ItemTooltip key={`${item.id}-${index}`} item={item} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">Aucun objet trouvé.</p>
                            )}
                        </div>
                    </div>

                    {/* Bonus Item */}
                    {summary.bonusItem && (
                        <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                            <h3 className="text-lg font-semibold mb-2 text-center text-yellow-400 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
                                Butin Inattendu !
                                <Sparkles className="h-5 w-5 ml-2 animate-pulse" />
                            </h3>
                            <div className="p-4 border-2 border-yellow-400 bg-yellow-400/10 rounded-lg flex justify-center">
                                <ItemTooltip item={summary.bonusItem} />
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
