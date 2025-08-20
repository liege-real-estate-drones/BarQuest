import type { InventoryState } from './types';

export const EQUIPMENT_SLOTS: (keyof InventoryState['equipment'])[] = [
    'head', 'chest', 'legs', 'feet', 'hands', 'weapon', 'offhand', 'amulet', 'ring', 'ring2', 'belt', 'trinket'
];

export const STAT_DISPLAY_NAMES: Record<string, string> = {
    'Force': 'Force',
    'Dexterite': 'Dextérité',
    'Intelligence': 'Intelligence',
    'Esprit': 'Esprit',
    'PV': 'Points de Vie',
    'CritPct': '% de Critique',
    'CritDmg': 'Dégâts Critiques',
    'Vitesse': "Vitesse d'Attaque",
    'Armure': 'Armure',
    'RessourceMax': 'Ressource Max',
    'Esquive': 'Esquive',
    'AttMin': 'Dégâts Min',
    'AttMax': 'Dégâts Max',
    'Precision': 'Précision',
    'ResElems.fire': 'Résistance Feu',
    'ResElems.ice': 'Résistance Glace',
    'ResElems.shadow': 'Résistance Ombre',
    'ResElems.nature': 'Résistance Nature',
    'BonusDmg.shadow': "Dégâts d'Ombre",
};

export const AFFIX_TO_THEME: Record<string, string> = {
    'ResElems.fire': 'fire',
    'ResElems.ice': 'ice',
    'Esprit': 'holy',
    'Dexterite': 'shadow',
};
