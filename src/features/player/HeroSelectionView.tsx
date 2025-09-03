'use client';

import { useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import type { Hero } from '@/lib/types';

export function HeroSelectionView() {
  const { heroes, switchHero, resetHero, renameHero, createNewHeroFlow } = useGameStore((state) => ({
    heroes: state.heroes,
    switchHero: state.switchHero,
    resetHero: state.resetHero,
    renameHero: state.renameHero,
    createNewHeroFlow: state.createNewHeroFlow,
  }));

  const { toast } = useToast();
  const [renamingHero, setRenamingHero] = useState<Hero | null>(null);
  const [newName, setNewName] = useState('');

  const handleRename = () => {
    if (renamingHero && newName.trim()) {
      if (renamingHero.inventory.gold >= 1000) {
        renameHero(renamingHero.id, newName.trim());
        setRenamingHero(null);
        setNewName('');
      } else {
        toast({
          title: "Not enough gold",
          description: "You need 1000 gold to rename your hero.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-headline text-primary">Select Your Hero</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {heroes.map((hero) => (
          <Card key={hero.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline">{hero.player.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {hero.player.classeId} - Level {hero.player.level}
              </p>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              <Button className="w-full" onClick={() => switchHero(hero.id)}>
                Play
              </Button>
              <Dialog open={renamingHero?.id === hero.id} onOpenChange={(isOpen) => !isOpen && setRenamingHero(null)}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" onClick={() => setRenamingHero(hero)}>
                    Rename
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename {hero.player.name}</DialogTitle>
                    <DialogDescription>
                      Renaming your hero costs 1000 gold. You have {hero.inventory.gold} gold.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    type="text"
                    placeholder="Enter new name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <DialogFooter>
                    <Button onClick={handleRename} disabled={hero.inventory.gold < 1000}>Save</Button>
                    <Button variant="ghost" onClick={() => setRenamingHero(null)}>Cancel</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete your hero {hero.player.name} and all their progress. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetHero(hero.id)}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button onClick={createNewHeroFlow}>
        Create New Hero
      </Button>
    </main>
  );
}
