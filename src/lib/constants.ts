import type { InventoryState } from './types';

export const EQUIPMENT_SLOTS: (keyof InventoryState['equipment'])[] = [
    'head', 'chest', 'legs', 'feet', 'hands', 'weapon', 'offhand', 'amulet', 'ring', 'ring2', 'belt', 'trinket'
];
