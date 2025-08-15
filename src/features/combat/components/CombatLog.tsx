'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombatLogEntry, Item, Rareté } from '@/lib/types';
import { useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

function ItemPopoverContent({ item }: { item: Item }) {
    if (!item) return null;
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

    if (entry.type === 'loot' && entry.item) {
        return (
            <p className={cn('whitespace-pre-wrap', color)}>
                <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                 Vous avez trouvé :{' '}
                <Popover>
                    <PopoverTrigger asChild>
                        <span className={`cursor-pointer underline decoration-dashed ${rarityColorMap[entry.item.rarity]}`}>[{entry.item.name}]</span>
                    </PopoverTrigger>
                    <PopoverContent>
                        <ItemPopoverContent item={entry.item} />
                    </PopoverContent>
                </Popover>
                .
            </p>
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
