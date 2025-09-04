// src/features/town/CraftingView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForgeView } from './ForgeView';
import { EnchanterView } from './EnchanterView';
import { SalvageView } from './SalvageView';

export const CraftingView: React.FC = () => {
    const { components } = useGameStore(state => state.gameData);
    const activeHero = useGameStore(state => state.getActiveHero());

    if (!activeHero) {
        return <p>Aucun héros actif.</p>;
    }
    const { craftingMaterials } = activeHero.inventory;

    const getMaterialName = (materialId: string) => {
        const component = components.find(c => c.id === materialId);
        return component ? component.name : materialId;
    };

    return (
        <div className="p-4">
            <Tabs defaultValue="forge">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="forge">Forgeron</TabsTrigger>
                    <TabsTrigger value="enchant">Enchanter</TabsTrigger>
                    <TabsTrigger value="salvage">Récupération</TabsTrigger>
                </TabsList>
                <TabsContent value="forge">
                    <ArtisanatForgeView />
                </TabsContent>
                <TabsContent value="enchant">
                    <EnchanterView />
                </TabsContent>
                <TabsContent value="salvage">
                    <SalvageView />
                </TabsContent>
            </Tabs>
             <Card className="mt-4">
                <CardHeader>
                    <CardTitle>Matériaux</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul>
                        {Object.entries(craftingMaterials).map(([materialId, count]) => (
                            <li key={materialId}>{getMaterialName(materialId)}: {count}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};
