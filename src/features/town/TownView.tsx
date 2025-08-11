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

export function TownView() {
  const { player } = useGameStore();

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-4xl font-headline text-primary">BarQuest</h1>
            <p className="text-muted-foreground">Welcome back, {player.name}.</p>
        </div>
        <Button>Export/Import Save</Button>
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
                <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dungeons">Dungeons</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="talents">Talents</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
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
            </Tabs>
        </div>
      </div>
    </div>
  );
}
