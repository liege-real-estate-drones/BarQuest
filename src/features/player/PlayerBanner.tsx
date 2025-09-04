'use client';

import * as React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function PlayerBanner({ children }: { children?: React.ReactNode }) {
  const { getActiveHero, unselectActiveHero, gameData, getXpToNextLevel } = useGameStore((state) => ({
    getActiveHero: state.getActiveHero,
    unselectActiveHero: state.unselectActiveHero,
    gameData: state.gameData,
    getXpToNextLevel: state.getXpToNextLevel,
  }));

  const activeHero = getActiveHero();

  if (!activeHero) {
    return null; // Don't render banner if no hero is active
  }

  const { player, inventory } = activeHero;

  const playerClass = gameData.classes.find((c) => c.id === player.classeId);
  const xpToNextLevel = getXpToNextLevel();
  const xpPercentage = xpToNextLevel > 0 ? (player.xp / xpToNextLevel) * 100 : 0;

  const bannerImageUrl = playerClass ? `/images/banners/${playerClass.id}.png` : '';

  return (
    <div
      className="relative h-32 w-full bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${bannerImageUrl})` }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {player.name} - Nv. {player.level}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold">{inventory.gold} Or</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={unselectActiveHero}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Changer de personnage</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span>XP</span>
            <span>
              {player.xp} / {xpToNextLevel}
            </span>
          </div>
          <Progress value={xpPercentage} className="h-2" indicatorClassName="bg-yellow-400" />
        </div>
      </div>
      {children && <div className="absolute top-4 right-4 z-20">{children}</div>}
    </div>
  );
}
