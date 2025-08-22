// src/features/town/CraftingView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtisanatForgeView } from './ArtisanatForgeView';
import { EnchanterView } from './EnchanterView';
export const CraftingView: React.FC = () => {
    const { components } = useGameStore(state => state.gameData);
    const { craftingMaterials } = useGameStore(state => state.inventory);

    const getMaterialName = (materialId: string) => {
        const component = components.find(c => c.id === materialId);
        return component ? component.name : materialId;
    };

    return (
        <div className="p-4">
            <Tabs defaultValue="forge">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="forge">Forgeron</TabsTrigger>
                    <TabsTrigger value="enchant">Enchanter</TabsTrigger>
                </TabsList>
                <TabsContent value="forge">
                    <ArtisanatForgeView />
                </TabsContent>
                <TabsContent value="enchant">
                    <EnchanterView />
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
