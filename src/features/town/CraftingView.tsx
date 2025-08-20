// src/features/town/CraftingView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForgeView } from './ForgeView';
import { EnchanterView } from './EnchanterView';
import { MATERIAL_DISPLAY_NAMES } from '@/lib/constants';

export const CraftingView: React.FC = () => {
    return (
        <div className="p-4">
            <Tabs defaultValue="forge">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="forge">Forger</TabsTrigger>
                    <TabsTrigger value="enchant">Enchanter</TabsTrigger>
                </TabsList>
                <TabsContent value="forge">
                    <ForgeView />
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
                        {Object.entries(useGameStore.getState().inventory.craftingMaterials).map(([materialId, count]) => (
                            <li key={materialId}>{MATERIAL_DISPLAY_NAMES[materialId] || materialId}: {count}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};
