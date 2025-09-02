import type { InventoryState } from './types';

export const NORMAL_MONSTER_RESISTANCE_PERCENTAGE = 0.6;

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
    'Dexterite': 'dexterity',
    'Force': 'strength',
    'Intelligence': 'intelligence',
    'CritPct': 'critical_chance',
    'BonusDmg.shadow': 'shadow',
};

export const MATERIAL_DISPLAY_NAMES: Record<string, string> = {
    'poussiere_arcanique': 'Poussière Arcanique',
    'essence_cosmique': 'Essence Cosmique',
    'cristal_du_vide': 'Cristal du Vide',
    'eclat_elementaire_feu': 'Éclat Élémentaire de Feu',
    'eclat_elementaire_givre': 'Éclat Élémentaire de Givre',
    'eclat_elementaire_ombre': 'Éclat Élémentaire d\'Ombre',
    'eclat_elementaire_nature': 'Éclat Élémentaire de Nature',
    'scrap_metal': 'Pièces de récupération',
};
