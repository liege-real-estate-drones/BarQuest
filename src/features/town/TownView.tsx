'use client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DungeonsView } from '../dungeons/DungeonsView';
import { InventoryView } from '../inventory/InventoryView';
import { TalentsView } from '../talents/TalentsView';
import { VendorsView } from '../vendors/VendorsView';
import { useGameStore } from '@/state/gameStore';
import { EquipmentView } from '../inventory/EquipmentView';
import { PlayerStatsView } from '../player/PlayerStatsView';
import { QuestsView } from '../quests/QuestsView';
import { ReputationView } from '../reputation/ReputationView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { LogOut, Settings, Trash2 } from 'lucide-react';
import { InnView } from './InnView';

export function TownView() {
  const { player, resetGame } = useGameStore(state => ({
    player: state.player,
    resetGame: state.resetGame
  }));

  return (
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-4xl font-headline text-primary">BarQuest</h1>
              <p className="text-muted-foreground">Welcome back, {player.name}.</p>
          </div>
          
          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Game Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <AlertDialogTrigger asChild>
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Change Class</span>
                    </DropdownMenuItem>
                 </AlertDialogTrigger>
                 <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-red-500 focus:text-red-500">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Reset Game</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible and will permanently delete all your character progress, items, and gold.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetGame} className="bg-destructive hover:bg-destructive/90">
                  Yes, reset my game
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <PlayerStatsView />
            <QuestsView />
            <ReputationView />
            <EquipmentView />
          </div>
          <div className="lg:col-span-2">
              <Tabs defaultValue="dungeons" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="dungeons">Dungeons</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="talents">Talents</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                  <TabsTrigger value="inn">Inn</TabsTrigger>
                  </TabsList>
                    <TabsContent value="dungeons" className="mt-4">
                      <DungeonsView />
                    </TabsContent>
                    <TabsContent value="inventory" className="mt-4">
                      <InventoryView />
                    </TabsContent>
                    <TabsContent value="talents" className="mt-4">
                      <TalentsView />
                    </TabsContent>
                    <TabsContent value="vendors" className="mt-4">
                      <VendorsView />
                    </TabsContent>
                    <TabsContent value="inn" className="mt-4">
                      <InnView />
                    </TabsContent>
              </Tabs>
          </div>
        </div>
      </div>
  );
}
