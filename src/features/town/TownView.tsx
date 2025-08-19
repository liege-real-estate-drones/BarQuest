// liege-real-estate-drones/barquest/BarQuest-ba29103e759395544a0519632ae86dfb86dc7427/src/features/town/TownView.tsx
'use client';
import { Button } from '@/components/ui/button';
import { DungeonsView } from '../dungeons/DungeonsView';
import { VendorsView } from '../vendors/VendorsView';
import { useGameStore } from '@/state/gameStore';
import { EquipmentView } from '../inventory/EquipmentView';
import { PlayerStatsView } from '../player/PlayerStatsView';
import { QuestsView } from '../quests/QuestsView';
import { ReputationView } from '../reputation/ReputationView';
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
import { LogOut, Settings, Trash2, BookOpen, User, Swords, Store, Home } from 'lucide-react';
import { InnView } from './InnView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CharacterView } from '../player/CharacterView';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type TownTab = 'town' | 'dungeons' | 'character' | 'vendors';

export function TownView() {
  const { player, resetGame } = useGameStore(state => ({
    player: state.player,
    resetGame: state.resetGame
  }));
  const [activeTab, setActiveTab] = useState<TownTab>('town');

  const renderContent = () => {
    switch (activeTab) {
      case 'town':
        return (
          // Le padding est appliqué ici pour ne pas interférer avec le layout flex
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-8 p-4">
              <PlayerStatsView />
              <QuestsView />
              <ReputationView />
            </div>
          </ScrollArea>
        );
      case 'dungeons':
         // La padding est appliqué ici aussi pour la consistance
        return <div className="p-4 h-full"><DungeonsView /></div>;
      case 'character':
        return <CharacterView />; // Pas de padding ici, il est géré dans le composant enfant
      case 'vendors':
        return <VendorsView />; // Pas de padding ici non plus
      default:
        return null;
    }
  };

  const NavButton = ({ tab, icon: Icon, label }: { tab: TownTab, icon: React.ElementType, label: string }) => (
    <Button
      variant="ghost"
      className={cn("flex-col h-16", activeTab === tab && "text-primary bg-primary/10")}
      onClick={() => setActiveTab(tab)}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs">{label}</span>
    </Button>
  );

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <header className="flex-shrink-0 container mx-auto px-4 py-4 flex justify-between items-center border-b">
        <div>
          <h1 className="text-2xl font-headline text-primary">BarQuest</h1>
          <p className="text-xs text-muted-foreground">Bienvenue, {player.name}.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr de vouloir réinitialiser ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible et supprimera définitivement toute votre progression.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={resetGame} className="bg-destructive hover:bg-destructive/90">
                Oui, réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>
      
      {/*
        CHANGEMENT PRINCIPAL ICI :
        - `flex-grow` permet à main de prendre toute la place restante.
        - `min-h-0` est la clé : cela permet au conteneur flex de réduire sa taille en dessous de la taille de son contenu,
          ce qui est nécessaire pour que `overflow-y-auto` fonctionne correctement dans un contexte flex.
        - `overflow-y-auto` ajoute une barre de défilement si le contenu dépasse.
      */}
      <main className="flex-grow container mx-auto px-4 min-h-0 overflow-y-auto">
        {renderContent()}
      </main>

      <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <nav className="container mx-auto grid grid-cols-4 gap-2 px-4 py-2">
          <NavButton tab="town" icon={Home} label="Ville" />
          <NavButton tab="dungeons" icon={Swords} label="Donjons" />
          <NavButton tab="character" icon={User} label="Personnage" />
          <NavButton tab="vendors" icon={Store} label="Marchands" />
        </nav>
      </footer>
    </div>
  );
}