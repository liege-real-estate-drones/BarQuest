// liege-real-estate-drones/barquest/BarQuest-ba29103e759395544a0519632ae86dfb86dc7427/src/features/player/CharacterView.tsx
'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryView } from '../inventory/InventoryView';
import { EquipmentView } from '../inventory/EquipmentView'; // Importez EquipmentView
import { SkillsView } from '../skills/SkillsView';
import { TalentsView } from '../talents/TalentsView';
import { ScrollArea } from '@/components/ui/scroll-area';

export function CharacterView() {
  return (
    // Le conteneur principal des onglets est un flexbox vertical qui remplit la hauteur disponible.
    <Tabs defaultValue="inventory" className="w-full flex flex-col h-full">
        {/* La liste des onglets ne doit pas s'agrandir. */}
        <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="inventory">Inventaire</TabsTrigger>
            <TabsTrigger value="talents">Talents</TabsTrigger>
            <TabsTrigger value="skills">Compétences</TabsTrigger>
        </TabsList>

        {/* Chaque contenu d'onglet est maintenant enveloppé dans sa propre ScrollArea. */}
        {/* 'h-full' est crucial ici pour que le contenu prenne la hauteur restante. */}
        <TabsContent value="inventory" className="m-0 flex-grow relative">
            <ScrollArea className="absolute inset-0 pr-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <InventoryView />
                    <EquipmentView />
                </div>
            </ScrollArea>
        </TabsContent>
        <TabsContent value="talents" className="m-0 flex-grow relative">
            <ScrollArea className="absolute inset-0 pr-4">
                <TalentsView />
            </ScrollArea>
        </TabsContent>
        <TabsContent value="skills" className="m-0 flex-grow relative">
            <ScrollArea className="absolute inset-0 pr-4">
                <SkillsView />
            </ScrollArea>
        </TabsContent>
    </Tabs>
  );
}