
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/state/gameStore';
import { BedDouble, Coins, Droplets, FlaskConical } from 'lucide-react';
import React from 'react';
import type { PotionType, ResourceType } from '@/lib/types';

const REST_COST = 25;
const POTION_COSTS: Record<PotionType, number> = {
    health: 50,
    resource: 75,
};

const resourcePotionInfo: Record<ResourceType, { name: string, icon: React.ReactNode }> = {
    "Mana": { name: "Potion de Mana", icon: <Droplets className="mr-2 h-4 w-4 text-blue-500" /> },
    "Rage": { name: "Fiole de Rage", icon: <Droplets className="mr-2 h-4 w-4 text-orange-500" /> },
    "Énergie": { name: "Potion d'Énergie", icon: <Droplets className="mr-2 h-4 w-4 text-yellow-500" /> },
};

export function InnView() {
  const { gold, buyPotion, rest, player } = useGameStore((state) => ({
    gold: state.inventory.gold,
    buyPotion: state.buyPotion,
    rest: state.rest,
    player: state.player,
  }));
  const { toast } = useToast();
  
  if (!player.classeId) return null;

  const handleBuyPotion = (type: PotionType) => {
    const success = buyPotion(type);
    const potionName = type === 'health' ? 'Potion de Soins' : resourcePotionInfo[player.resources.type].name;
    if (success) {
      toast({
        title: 'Potion achetée',
        description: `Vous avez acheté une ${potionName}.`,
      });
    } else {
      toast({
        title: 'Pas assez d\'or',
        description: `Vous ne pouvez pas vous permettre d'acheter cette potion.`,
        variant: 'destructive',
      });
    }
  };

  const handleRest = () => {
    const success = rest();
    if (success) {
      toast({
        title: 'Vous vous sentez reposé',
        description: 'Vos points de vie et vos ressources ont été entièrement restaurés.',
      });
    } else {
      toast({
        title: 'Pas assez d\'or',
        description: 'Vous ne pouvez pas vous permettre de vous reposer ici.',
        variant: 'destructive',
      });
    }
  };
  
  const currentResourceInfo = resourcePotionInfo[player.resources.type];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auberge de la Hache Rouillée</CardTitle>
        <CardDescription>Reposez-vous, voyageur. Ou peut-être acheter quelques biens ?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-card-foreground/5">
          <div>
            <h3 className="font-semibold">Se reposer pour la nuit</h3>
            <p className="text-sm text-muted-foreground">Restaure entièrement les PV et les ressources.</p>
          </div>
          <Button onClick={handleRest} disabled={gold < REST_COST}>
            <BedDouble className="mr-2 h-4 w-4" />
            Reposer ({REST_COST} <Coins className="ml-1 h-3 w-3" />)
          </Button>
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-card-foreground/5">
          <div>
            <h3 className="font-semibold">Acheter une Potion de Soins</h3>
            <p className="text-sm text-muted-foreground">Restaure 15% de vos PV maximum.</p>
          </div>
          <Button onClick={() => handleBuyPotion('health')} variant="outline" disabled={gold < POTION_COSTS.health}>
            <FlaskConical className="mr-2 h-4 w-4 text-red-500" />
            Acheter ({POTION_COSTS.health} <Coins className="ml-1 h-3 w-3" />)
          </Button>
        </div>
         <div className="flex items-center justify-between p-4 rounded-lg bg-card-foreground/5">
          <div>
            <h3 className="font-semibold">Acheter une {currentResourceInfo.name}</h3>
            <p className="text-sm text-muted-foreground">Restaure 25% de votre {player.resources.type} maximum.</p>
          </div>
          <Button onClick={() => handleBuyPotion('resource')} variant="outline" disabled={gold < POTION_COSTS.resource}>
            {currentResourceInfo.icon}
            Acheter ({POTION_COSTS.resource} <Coins className="ml-1 h-3 w-3" />)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
