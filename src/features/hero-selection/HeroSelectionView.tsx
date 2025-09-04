'use client';

import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, Trash2, Play, PlusCircle, RefreshCw } from 'lucide-react';

export function HeroSelectionView() {
  const { heroes, selectHero, deleteHero, resetHero, gameData, startCharacterCreation } = useGameStore(state => ({
    heroes: state.heroes,
    selectHero: state.selectHero,
    deleteHero: state.deleteHero,
    resetHero: state.resetHero,
    gameData: state.gameData,
    startCharacterCreation: state.startCharacterCreation,
  }));

  const getClassName = (classId: string | null) => {
    if (!classId) return 'Inconnu';
    return gameData.classes.find(c => c.id === classId)?.nom || 'Inconnu';
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold">Sélection du Héros</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Choisissez un personnage pour continuer votre aventure ou créez-en un nouveau.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {heroes.map(hero => (
            <div key={hero.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <User className="h-8 w-8 text-blue-400" />
                <div>
                  <p className="font-semibold text-lg">{hero.player.name}</p>
                  <p className="text-sm text-gray-400">
                    {getClassName(hero.player.classeId)} - Niveau {hero.player.level}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => selectHero(hero.id)} variant="secondary" size="sm">
                  <Play className="mr-2 h-4 w-4" />
                  Jouer
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-gray-900">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Réinitialiser ce héros ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action réinitialisera toute la progression, l&apos;équipement et l&apos;or de{' '}
                        <span className="font-bold mx-1">{hero.player.name}</span> au niveau 1. Cette action est irréversible. Voulez-vous continuer ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => resetHero(hero.id)} className="bg-yellow-400 text-gray-900 hover:bg-yellow-500">
                        Oui, réinitialiser
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce héros ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Toute la progression, l&apos;équipement et l&apos;or de
                        <span className="font-bold mx-1">{hero.player.name}</span>
                        seront définitivement perdus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteHero(hero.id)} className="bg-destructive hover:bg-destructive/90">
                        Oui, supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button
            onClick={startCharacterCreation}
            className="w-full"
            variant="outline"
            disabled={heroes.length >= gameData.classes.length}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un nouveau personnage
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
