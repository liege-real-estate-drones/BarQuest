'use client';

import * as React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

export function HeroMenu() {
  const { startCharacterCreation, unselectActiveHero } = useGameStore((state) => ({
    startCharacterCreation: state.startCharacterCreation,
    unselectActiveHero: state.unselectActiveHero,
  }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={startCharacterCreation}>Créer un personnage</DropdownMenuItem>
        <DropdownMenuItem onClick={unselectActiveHero}>Changer de personnage</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
