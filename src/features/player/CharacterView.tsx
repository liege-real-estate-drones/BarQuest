
'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryView } from '../inventory/InventoryView';
import { SkillsView } from '../skills/SkillsView';
import { TalentsView } from '../talents/TalentsView';

export function CharacterView() {
  return (
    <Tabs defaultValue="inventory" className="w-full flex flex-col flex-grow min-h-0">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventaire</TabsTrigger>
            <TabsTrigger value="talents">Talents</TabsTrigger>
            <TabsTrigger value="skills">Compétences</TabsTrigger>
        </TabsList>
        <div className="flex-grow mt-4 overflow-y-auto">
            <TabsContent value="inventory" className="m-0 h-full">
                <InventoryView />
            </TabsContent>
            <TabsContent value="talents" className="m-0 h-full">
                <TalentsView />
            </TabsContent>
            <TabsContent value="skills" className="m-0 h-full">
                <SkillsView />
            </TabsContent>
        </div>
    </Tabs>
  );
}
