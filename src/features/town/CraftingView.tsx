// src/features/town/CraftingView.tsx
import React from 'react';
import { useGameStore } from '@/state/gameStore';

export const CraftingView: React.FC = () => {
    const { player, inventory, dismantleItem, enchantItem } = useGameStore(state => ({
        player: state.player,
        inventory: state.inventory,
        dismantleItem: state.dismantleItem,
        enchantItem: state.enchantItem,
    }));

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Artisanat</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h2 className="text-xl font-semibold">Démanteler</h2>
                    <div className="mt-2 space-y-2">
                        {inventory.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                                <span>{item.name}</span>
                                <button
                                    onClick={() => dismantleItem(item.id)}
                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    Démanteler
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h2 className="text-xl font-semibold">Enchanter</h2>
                     <div className="mt-2 space-y-2">
                        {inventory.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2 border rounded">
                                <span>{item.name}</span>
                                <button
                                    onClick={() => enchantItem(item.id)}
                                    className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                                >
                                    Enchanter
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-4">
                <h2 className="text-xl font-semibold">Matériaux</h2>
                <ul>
                    {Object.entries(inventory.craftingMaterials).map(([materialId, count]) => (
                        <li key={materialId}>{materialId}: {count}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
