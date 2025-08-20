// src/core/itemGenerator.ts
import type { Item, Rareté, Affixe } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import nameModifiersData from '../../public/data/nameModifiers.json';

const { qualifiers, materials, themes, naming_patterns, affixes: affixModifiers } = nameModifiersData;

const rarityAffixCount: Record<Rareté, [number, number]> = {
    "Commun": [0, 1],
    "Magique": [0, 1], // Added Magique
    "Rare": [1, 2],
    "Épique": [2, 3],
    "Légendaire": [0, 0], // Legendary items are predefined
    "Unique": [0, 0], // Unique items are predefined
};

// Maps game rarities to the keys in nameModifiers.qualifiers
const rarityToQualifierKey: Record<string, string> = {
    "Commun": "common",
    "Rare": "superior",
    "Épique": "epic",
    "Légendaire": "legendary",
};

// Maps affix 'ref' from the game to keys in nameModifiers.affixes
const affixRefToModifierKey: Record<string, string> = {
    'Force': 'strength',
    'Dexterite': 'dexterity',
    'Intelligence': 'intelligence',
    'Esprit': 'intelligence',
    'PV': 'vitality',
    'Armure': 'defense',
    'Vitesse': 'attack_speed',
    'CritPct': 'critical_chance',
    'CritDmg': 'critical_chance',
    'RessourceMax': 'intelligence',
    'Esquive': 'dexterity',
    'AttMin': 'strength',
    'AttMax': 'strength',
};

// Maps affix 'ref' from the game to a theme key
const affixToTheme: Record<string, string> = {
    'ResElems.fire': 'fire',
    'ResElems.ice': 'ice',
    'Esprit': 'holy',
    'Dexterite': 'shadow',
};


const scaleAffixValue = (baseValue: number, level: number): number => {
    return Math.round(baseValue + (baseValue * level * 0.1) + (level * 0.5));
};

export const generateProceduralItem = (
    baseItem: Omit<Item, 'id' | 'niveauMin' | 'rarity'> & { material_type?: string },
    itemLevel: number,
    rarity: Rareté,
    availableAffixes: Affixe[],
    dungeonTheme?: string, // Optional: to link the name to the dungeon
    monsterTheme?: string // Optional: to link the name to the monster family
): Item => {
    const qualifierCategoryKey = rarityToQualifierKey[rarity] || 'common';
    const qualifierCategory = (qualifiers as any)[qualifierCategoryKey];
    const qualifierMultiplier = qualifierCategory ? qualifierCategory.multiplier : 1.0;

    const newItem: Item = {
        ...baseItem,
        id: uuidv4(),
        niveauMin: itemLevel,
        rarity: rarity,
        affixes: [],
        vendorPrice: Math.round((baseItem.vendorPrice || 1) * qualifierMultiplier),
    };

    const [minAffixes, maxAffixes] = rarityAffixCount[rarity] || [0, 0];
    const numAffixes = Math.floor(Math.random() * (maxAffixes - minAffixes + 1)) + minAffixes;

    if (numAffixes > 0 && availableAffixes) {
        const shuffledAffixes = [...availableAffixes].sort(() => 0.5 - Math.random());
        const selectedAffixes = shuffledAffixes.slice(0, numAffixes);

        newItem.affixes = selectedAffixes.map(affix => {
            const [min, max] = affix.portée;
            const baseValue = Math.floor(Math.random() * (max - min + 1)) + min;
            const scaledValue = scaleAffixValue(baseValue, itemLevel);
            return { ref: affix.ref, val: scaledValue };
        });
    }

    let finalName = baseItem.name;
    const patterns = (naming_patterns as Record<string, string[]>)[rarity];

    if (patterns) {
        let pattern = patterns[Math.floor(Math.random() * patterns.length)];

        if (pattern.includes('{qualifier}')) {
            const qualifierNames = qualifierCategory.names;
            const randomQualifier = qualifierNames[Math.floor(Math.random() * qualifierNames.length)];
            pattern = pattern.replace('{qualifier}', randomQualifier);
        }

        pattern = pattern.replace('{baseName}', baseItem.name);

        // --- Theme Selection (Priority: Affix > Monster > Dungeon) ---
        let chosenThemeName: string | undefined;
        // 1. Try to find a theme from the item's affixes
        if (newItem.affixes) {
            for (const affix of newItem.affixes) {
                const themeName = (affixToTheme as Record<string, string>)[affix.ref];
                if (themeName) {
                    chosenThemeName = themeName;
                    break;
                }
            }
        }
        // 2. Fallback to monster theme if no affix theme is found
        if (!chosenThemeName) {
            chosenThemeName = monsterTheme;
        }
        // 3. Fallback to dungeon theme if no monster theme is found
        if (!chosenThemeName) {
            chosenThemeName = dungeonTheme;
        }

        const theme = chosenThemeName && (themes as any)[chosenThemeName] ? (themes as any)[chosenThemeName] : null;

        if (pattern.includes('{prefix}')) {
            let prefix = '';
            if (theme && theme.prefixes) {
                prefix = theme.prefixes[Math.floor(Math.random() * theme.prefixes.length)];
            } else if (newItem.affixes && newItem.affixes.length > 0) {
                const mainAffixRef = newItem.affixes[0].ref;
                const modifierKey = affixRefToModifierKey[mainAffixRef];
                const modifier = modifierKey ? (affixModifiers as any)[modifierKey] : null;
                if (modifier && modifier.prefix) {
                    prefix = modifier.prefix;
                }
            }
            pattern = pattern.replace('{prefix}', prefix);
        }

        if (pattern.includes('{suffix}')) {
            let suffix = '';
            if (theme && theme.suffixes) {
                suffix = theme.suffixes[Math.floor(Math.random() * theme.suffixes.length)];
            } else if (newItem.affixes && newItem.affixes.length > 0) {
                const mainAffixRef = newItem.affixes[0].ref;
                const modifierKey = affixRefToModifierKey[mainAffixRef];
                const modifier = modifierKey ? (affixModifiers as any)[modifierKey] : null;
                if (modifier && modifier.suffix) {
                    suffix = modifier.suffix;
                }
            }
            pattern = pattern.replace('{suffix}', suffix);
        }

        finalName = pattern.trim().replace(/\s+/g, ' ');

    } else {
      // Fallback for rarities without a defined pattern (e.g., Commun)
      if (baseItem.material_type && (materials as any)[baseItem.material_type]) {
        const materialList = (materials as any)[baseItem.material_type];
        // Select material based on item level, capping at the highest available tier
        const materialIndex = Math.min(Math.floor(itemLevel / 10), materialList.length - 1);
        const suitableMaterial = materialList[materialIndex];
        if (suitableMaterial) {
            finalName = `${baseItem.name} ${suitableMaterial}`;
        }
      }
    }

    newItem.name = finalName;
    return newItem;
};
