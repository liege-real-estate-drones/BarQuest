'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CombatLogEntry } from '@/lib/types';
import { useRef, useEffect } from 'react';

interface CombatLogProps {
  log: CombatLogEntry[];
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

export function CombatLog({ log }: CombatLogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        // Access the viewport element. Based on shadcn/ui structure.
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
              <p key={index} className={cn('whitespace-pre-wrap', getLogEntryColor(entry.type))}>
                <span className="text-muted-foreground/50 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                {entry.message}
              </p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
