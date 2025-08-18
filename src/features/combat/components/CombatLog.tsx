
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombatLogEntry, Item, Rareté } from '@/lib/types';
import { useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ItemTooltip } from '@/components/ItemTooltip';
import { useGameStore } from '@/state/gameStore';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

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
    default:
      return 'text-foreground';
  }
};

const LogMessage = ({ entry }: { entry: CombatLogEntry }) => {
    const color = getLogEntryColor(entry.type);
    const equipment = useGameStore(s => s.inventory.equipment);

    if (entry.type === 'loot' && entry.item) {
        return (
            <div className={cn('whitespace-pre-wrap', color)}>
                <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                 Vous avez trouvé :{' '}
                <ItemTooltip 
                    item={entry.item} 
                    equippedItem={equipment[entry.item.slot as keyof typeof equipment]}
                    triggerClassName={rarityColorMap[entry.item.rarity]}
                >
                </ItemTooltip>
                .
            </div>
        );
    }
    
    return (
        <p className={cn('whitespace-pre-wrap', color)}>
            <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
            {entry.message}
        </p>
    );
};


export function CombatLog({ log }: { log: CombatLogEntry[] }) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if(viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [log]);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3">
        <CardTitle className="font-headline text-lg">Combat Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
        <div className="flex flex-col gap-1 font-code text-xs">
            {log.map((entry, index) => (
                <LogMessage key={index} entry={entry} />
            ))}
        </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
