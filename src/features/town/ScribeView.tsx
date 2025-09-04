'use client';

import * as React from 'react';
import { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { RENAME_COST } from '@/lib/constants';
import { ArrowLeft } from 'lucide-react';
import { isValidName } from '@/lib/utils';

interface ScribeViewProps {
  onBack: () => void;
}

export function ScribeView({ onBack }: ScribeViewProps) {
  const { renameActiveHero, getActiveHero } = useGameStore((state) => ({
    renameActiveHero: state.renameActiveHero,
    getActiveHero: state.getActiveHero,
  }));
  const { toast } = useToast();

  const activeHero = getActiveHero();
  const [newName, setNewName] = useState(activeHero?.player.name || '');

  if (!activeHero) {
    return (
      <div className="text-center p-4">
        <p>Aucun héros actif.</p>
        <Button onClick={onBack} className="mt-4">Retour</Button>
      </div>
    );
  }

  const handleRename = () => {
    if (!isValidName(newName)) {
      toast({
        title: 'Nom invalide',
        description: 'Le nom doit contenir entre 3 et 16 caractères et ne peut pas contenir de caractères spéciaux.',
        variant: 'destructive',
      });
      return;
    }

    if (activeHero.inventory.gold < RENAME_COST) {
      toast({
        title: 'Or insuffisant',
        description: `Vous avez besoin de ${RENAME_COST} or pour changer de nom.`,
        variant: 'destructive',
      });
      return;
    }

    const success = renameActiveHero(newName);

    if (success) {
      toast({
        title: 'Succès !',
        description: `Votre nom a été changé en ${newName}.`,
      });
    } else {
      // This case might be redundant due to the checks above, but it's a good fallback.
      toast({
        title: 'Erreur',
        description: 'Le changement de nom a échoué pour une raison inconnue.',
        variant: 'destructive',
      });
    }
  };

  const hasEnoughGold = activeHero.inventory.gold >= RENAME_COST;
  const isNameUnchanged = newName === activeHero.player.name;
  const isNameInvalid = !isValidName(newName);

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800 border-gray-700 text-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <CardTitle className="text-2xl font-bold text-center flex-grow">Le Scribe</CardTitle>
          <div className="w-8"></div> {/* Spacer to keep title centered */}
        </div>
        <CardDescription className="text-center text-gray-400 pt-2">Changement de nom</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-gray-300">
          Pour la modique somme de <span className="font-bold text-yellow-400">{RENAME_COST}</span> or, je peux inscrire votre nouveau nom dans les annales.
        </p>
        <div className="space-y-2">
          <label htmlFor="newName" className="text-sm font-medium text-gray-300">Nouveau nom</label>
          <Input
            id="newName"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Entrez votre nouveau nom"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleRename}
          className="w-full"
          disabled={!hasEnoughGold || isNameUnchanged || isNameInvalid}
        >
          Confirmer le changement
        </Button>
      </CardFooter>
    </Card>
  );
}
