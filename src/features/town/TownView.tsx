// liege-real-estate-drones/barquest/BarQuest-ba29103e759395544a0519632ae86dfb86dc7427/src/features/town/TownView.tsx
'use client';
import { Button } from '@/components/ui/button';
import { DungeonsView } from '../dungeons/DungeonsView';
import { VendorsView } from '../vendors/VendorsView';
import { useGameStore } from '@/state/gameStore';
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
import { Settings, User, Swords, Store, Home } from 'lucide-react';
import { InnView } from './InnView';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CharacterView } from '../player/CharacterView';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CraftingView } from './CraftingView';

type TownTab = 'town' | 'dungeons' | 'character' | 'vendors';

export function TownView() {
  const { player, resetGame, townView, setTownView } = useGameStore(state => ({
    player: state.player,
    resetGame: state.resetGame,
    townView: state.townView,
    setTownView: state.setTownView,
  }));
  const [activeTab, setActiveTab] = useState<TownTab>('town');

  const renderContent = () => {
    switch (activeTab) {
      case 'town':
        return (
          <ScrollArea className="h-full">
            {/* Utilisation d'une grille pour une mise en page plus riche */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
              {/* Le journal de quêtes prend toute la largeur sur les grands écrans */}
              <div className="md:col-span-2">
                <QuestsView />
              </div>
              {/* Les stats du joueur, un élément central */}
              <PlayerStatsView />
              {/* L'auberge, une action clé */}
              <InnView />
              {/* La réputation, pour suivre la progression à long terme */}
              <div className="md:col-span-2">
                <ReputationView />
              </div>
              <div className="md:col-span-2">
                <CraftingView />
              </div>
            </div>
          </ScrollArea>
        );
      case 'dungeons':
        return <div className="p-4 h-full"><DungeonsView /></div>;
      case 'character':
        return <CharacterView />;
      case 'vendors':
        return <VendorsView />;
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