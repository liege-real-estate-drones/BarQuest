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
import { PlayerBanner } from '../player/PlayerBanner';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CraftingView } from './CraftingView';
import { ScribeView } from './ScribeView';

type TownTab = 'town' | 'dungeons' | 'character' | 'vendors';
type TownSubView = 'main' | 'scribe';

export function TownView() {
  const { resetGame, townView, setTownView, setActiveSubView } = useGameStore(state => ({
    resetGame: state.resetGame,
    townView: state.townView,
    setTownView: state.setTownView,
    setActiveSubView: state.setActiveSubView,
  }));
  const [activeTab, setActiveTab] = useState<TownTab>('town');
  const [townSubView, setTownSubView] = useState<TownSubView>('main');

  useEffect(() => {
    // Reset sub-view when changing main tabs
    setTownSubView('main');

    switch(activeTab) {
      case 'town':
        setActiveSubView('TOWN');
        break;
      case 'dungeons':
        setActiveSubView('DUNGEONS_LIST');
        break;
      case 'character':
        setActiveSubView('CHARACTER');
        break;
      case 'vendors':
        setActiveSubView('VENDORS');
        break;
    }
  }, [activeTab, setActiveSubView]);

  const renderContent = () => {
    switch (activeTab) {
      case 'town':
        if (townSubView === 'scribe') {
          return <div className="p-4"><ScribeView onBack={() => setTownSubView('main')} /></div>;
        }
        return (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
              <div className="md:col-span-2">
                <QuestsView />
              </div>
              <InnView />
              <div className="p-6 bg-gray-800/50 rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Le Scribe</h3>
                  <p className="text-gray-400 mb-4">
                    Changez de nom pour la postérité. Un service rapide, mais pas gratuit.
                  </p>
                </div>
                <Button onClick={() => setTownSubView('scribe')} className="mt-auto">
                  Parler au Scribe
                </Button>
              </div>
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
      <PlayerBanner>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/50 text-white">
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
      </PlayerBanner>
      
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