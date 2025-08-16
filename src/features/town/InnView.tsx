
'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/state/gameStore';
import { BedDouble, Coins, FlaskConical } from 'lucide-react';
import React from 'react';

const REST_COST = 25;
const POTION_COST = 50;

export function InnView() {
  const { gold, buyPotion, rest } = useGameStore((state) => ({
    gold: state.inventory.gold,
    buyPotion: state.buyPotion,
    rest: state.rest,
  }));
  const { toast } = useToast();

  const handleBuyPotion = () => {
    const success = buyPotion();
    if (success) {
      toast({
        title: 'Potion achetée',
        description: 'Vous avez acheté une potion de soins mineure.',
      });
    } else {
      toast({
        title: 'Pas assez d\'or',
        description: 'Vous ne pouvez pas vous permettre d\'acheter une potion.',
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
          <Button onClick={handleBuyPotion} variant="outline" disabled={gold < POTION_COST}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Acheter ({POTION_COST} <Coins className="ml-1 h-3 w-3" />)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
