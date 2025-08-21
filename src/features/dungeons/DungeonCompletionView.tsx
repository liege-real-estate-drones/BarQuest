'use client';

import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ItemTooltip } from '@/components/ItemTooltip';
import { Coins, Star, Swords, Scroll } from 'lucide-react';
import { Item, Rareté } from '@/data/schemas';
import type { Enchantment, CombatLogEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const getLogEntryColor = (type: CombatLogEntry['type']) => {
  switch (type) {
    case 'player_attack':
      return 'text-green-400';
    case 'enemy_attack':
      return 'text-red-400';
    case 'crit':
      return 'text-yellow-400 font-bold';
    case 'levelup':
        return 'text-yellow-300 font-bold text-lg animate-pulse';
    case 'loot':
      return 'text-primary';
    case 'info':
      return 'text-blue-400';
    case 'flee':
      return 'text-gray-400 italic';
    case 'heal':
      return 'text-emerald-400';
    case 'shield':
      return 'text-cyan-400';
    case 'poison_proc':
      return 'text-lime-400';
    default:
      return 'text-foreground';
  }
};

const LogMessage = ({ entry }: { entry: CombatLogEntry }) => {
    const color = getLogEntryColor(entry.type);

    if (entry.type === 'loot' && entry.item) {
        const rarityColorMap: Record<Rareté, string> = {
            Commun: 'text-gray-400',
            Magique: 'text-blue-300',
            Rare: 'text-yellow-400', // Adjusted for better visibility on dark backgrounds
            Épique: 'text-purple-400',
            Légendaire: 'text-orange-400',
            Unique: 'text-red-500 font-bold',
        };
        const itemColor = rarityColorMap[entry.item.rarity] || 'text-white';

        return (
            <div className={cn('whitespace-pre-wrap text-sm', color)}>
                <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                 Vous avez trouvé :{' '}
                <span className={cn('font-bold', itemColor)}>{`[${entry.item.name}]`}</span>
                .
            </div>
        );
    }

    return (
        <p className={cn('whitespace-pre-wrap text-sm', color)}>
            <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
            {entry.message}
        </p>
    );
};


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

                    {/* Recipes Learned */}
                    {summary.recipesGained && summary.recipesGained.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center">
                                <Scroll className="h-5 w-5 mr-2 text-yellow-400" />
                                Nouvelles Recettes Apprises
                            </h3>
                            <div className="p-4 border bg-purple-900/10 rounded-lg space-y-2">
                                {summary.recipesGained.map((recipe: Enchantment, index: number) => (
                                    <div key={index} className="text-center text-purple-300 font-medium">
                                        Vous avez appris: {recipe.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">Voir le journal de combat</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Journal de Combat Complet</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="flex-grow">
                                <div className="flex flex-col gap-1 font-code text-xs p-4">
                                    {summary.combatLog && summary.combatLog.map((entry, index) => (
                                        <LogMessage key={`${entry.timestamp}-${index}`} entry={entry} />
                                    ))}
                                </div>
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={closeSummary} className="w-full text-lg py-6 sm:py-2">
                        Retourner en ville
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
