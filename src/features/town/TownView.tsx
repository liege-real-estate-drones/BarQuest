

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
import { LogOut, Settings, Trash2, BookOpen } from 'lucide-react';
import { InnView } from './InnView';
import { SkillsView } from '../skills/SkillsView';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TownView() {
  const { player, resetGame } = useGameStore(state => ({
    player: state.player,
    resetGame: state.resetGame
  }));

  return (
      <div className="flex flex-col h-screen max-h-screen">
        <header className="flex-shrink-0 container mx-auto px-4 md:px-8 py-4 flex justify-between items-center border-b">
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
        
        <main className="flex-grow container mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
          <ScrollArea className="lg:col-span-1">
            <div className="flex flex-col gap-8 pr-6">
              <PlayerStatsView />
              <ReputationView />
              <EquipmentView />
            </div>
          </ScrollArea>
          <div className="lg:col-span-2 flex flex-col min-h-0">
              <Tabs defaultValue="dungeons" className="w-full flex flex-col flex-grow min-h-0">
                  <TabsList className="grid w-full grid-cols-7 flex-shrink-0">
                    <TabsTrigger value="dungeons">Dungeons</TabsTrigger>
                    <TabsTrigger value="quests"><BookOpen className="mr-2 h-4 w-4" />Quests</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                    <TabsTrigger value="talents">Talents</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="vendors">Vendors</TabsTrigger>
                    <TabsTrigger value="inn">Inn</TabsTrigger>
                  </TabsList>
                  <div className="flex-grow mt-4 overflow-y-auto">
                    <TabsContent value="dungeons">
                        <DungeonsView />
                    </TabsContent>
                     <TabsContent value="quests" className="h-full">
                        <QuestsView />
                    </TabsContent>
                    <TabsContent value="inventory">
                      <InventoryView />
                    </TabsContent>
                    <TabsContent value="talents">
                       <TalentsView />
                    </TabsContent>
                    <TabsContent value="skills">
                      <SkillsView />
                    </TabsContent>
                    <TabsContent value="vendors">
                      <VendorsView />
                    </TabsContent>
                    <TabsContent value="inn">
                      <InnView />
                    </TabsContent>
                  </div>
              </Tabs>
          </div>
        </main>
      </div>
  );
}
