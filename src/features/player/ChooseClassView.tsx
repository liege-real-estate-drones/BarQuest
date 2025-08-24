'use client';

import { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PlayerClassId } from '@/lib/types';

export function ChooseClassView() {
  const { classes, setPlayerClass } = useGameStore((state) => ({
    classes: state.gameData.classes,
    setPlayerClass: state.setPlayerClass,
  }));
  const [name, setName] = useState('');

  const handleClassSelection = (classId: PlayerClassId) => {
    if (name.trim()) {
      setPlayerClass(classId, name.trim());
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-headline text-primary">Choose Your Class</h1>
        <p className="text-muted-foreground">Your journey is about to begin. Who will you be?</p>
      </div>
      <div className="w-full max-w-sm mb-8">
        <Input
          type="text"
          placeholder="Enter your hero's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="text-center text-lg"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {classes.map((cls) => (
          <Card key={cls.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline">{cls.nom}</CardTitle>
              <CardDescription>{cls.archétype}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <p className="text-sm">Ressource: <span className="text-primary">{cls.ressource}</span></p>
              <p className="text-xs text-muted-foreground">
                A starting class focusing on heavy melee combat and durability.
              </p>
            </CardContent>
            <div className="p-4 pt-0">
               <Button
                 className="w-full"
                 onClick={() => handleClassSelection(cls.id as PlayerClassId)}
                 disabled={!name.trim()}
               >
                    Choose {cls.nom}
               </Button>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
