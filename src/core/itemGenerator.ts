// src/core/itemGenerator.ts
import type { Item, Rareté, Affixe, MaterialType, Theme } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import nameModifiersData from '../../public/data/nameModifiers.json';

const { qualifiers, materials, themes, naming_patterns, affixes: statNameModifiers } = nameModifiersData;

// Helper function to get a random element from an array
const getRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const rarityAffixCount: Record<Rareté, [number, number]> = {
    "Commun": [0, 1],
    "Magique": [1, 2],
    "Rare": [2, 3],
    "Épique": [3, 4],
    "Légendaire": [0, 0], // Legendary items are predefined
    "Unique": [0, 0], // Unique items are predefined
};

const rarityToQualifierMap: Record<string, keyof typeof qualifiers | null> = {
    "Commun": "common",
    "Rare": "superior",
    "Épique": "epic",
    "Légendaire": "legendary",
    "Magique": null, // Magique rarity does not use a qualifier in its pattern
};

const scaleAffixValue = (baseValue: number, level: number): number => {
    // A simple scaling formula, can be improved
    return Math.round(baseValue + (baseValue * level * 0.1) + (level * 0.5));
};

export const generateProceduralItem = (
    baseItem: Omit<Item, 'id' | 'niveauMin' | 'rarity'>,
    itemLevel: number,
    rarity: Rareté,
    availableAffixes: Affixe[],
    dungeonTheme?: Theme,
    monsterFamily?: string
): Item => {

    const newItem: Item = {
        ...baseItem,
        id: uuidv4(),
        niveauMin: itemLevel,
        rarity: rarity,
        affixes: [],
        vendorPrice: baseItem.vendorPrice || 1,
    };

    // --- Affix Generation (from original logic) ---
    const [minAffixes, maxAffixes] = rarityAffixCount[rarity] || [0, 0];
    const numAffixes = Math.floor(Math.random() * (maxAffixes - minAffixes + 1)) + minAffixes;

    if (numAffixes > 0) {
        const shuffledAffixes = [...availableAffixes].sort(() => 0.5 - Math.random());
        newItem.affixes = shuffledAffixes.slice(0, numAffixes).map(affix => {
            const [min, max] = affix.portée;
            const baseValue = Math.floor(Math.random() * (max - min + 1)) + min;
            const scaledValue = scaleAffixValue(baseValue, itemLevel);
            return { ref: affix.ref, val: scaledValue };
        });
    }

    // --- New Intelligent Name Generation ---

    // 1. Choose a naming pattern based on rarity
    const patterns = naming_patterns[rarity as keyof typeof naming_patterns] || ["{baseName}"];
    let finalName = getRandom(patterns);

    // 2. Replace placeholders
    finalName = finalName.replace('{baseName}', baseItem.name);

    // 2a. Replace {material}
    if (finalName.includes('{material}')) {
        const materialType = baseItem.material_type as keyof typeof materials;
        if (materialType && materials[materialType]) {
            // The new data structure doesn't have levels, so we pick a random one from the category.
            // A future improvement could be to have sub-levels within material categories.
            const chosenMaterial = getRandom(materials[materialType]);
            finalName = finalName.replace('{material}', chosenMaterial);
        } else {
            // Fallback if material is missing
            finalName = finalName.replace('{material}', '');
        }
    }

    // 2b. Replace {qualifier}
    if (finalName.includes('{qualifier}')) {
        const qualifierCategory = rarityToQualifierMap[rarity];
        if (qualifierCategory && qualifiers[qualifierCategory]) {
            const chosenQualifier = getRandom(qualifiers[qualifierCategory].names);
            finalName = finalName.replace('{qualifier}', chosenQualifier);

            // Also adjust vendor price based on qualifier multiplier
            const qualifierMod = qualifiers[qualifierCategory].multiplier;
            newItem.vendorPrice = Math.round(newItem.vendorPrice! * qualifierMod);
        } else {
            finalName = finalName.replace('{qualifier}', '');
        }
    }

    // 2c. Replace thematic affixes
    let themeName: Theme | undefined = undefined;

    // Priority 1: Affix-based theme
    const affixWithTheme = (newItem.affixes || [])
        .map(affix => availableAffixes.find(a => a.ref === affix.ref))
        .find(affixDef => affixDef?.theme);

    if (affixWithTheme) {
        themeName = affixWithTheme.theme;
    } else {
        // Priority 2: Monster family theme
        themeName = monsterFamily && themes[monsterFamily as keyof typeof themes]
            ? monsterFamily as Theme
            : dungeonTheme; // Priority 3: Dungeon theme
    }

    if (themeName && themes[themeName as keyof typeof themes]) {
        const theme = themes[themeName as keyof typeof themes];
        if (finalName.includes('{prefix_theme}')) {
            finalName = finalName.replace('{prefix_theme}', getRandom(theme.prefixes));
        }
        if (finalName.includes('{suffix_theme}')) {
            finalName = finalName.replace('{suffix_theme}', getRandom(theme.suffixes));
        }
    }

    // 2d. Replace stat affixes
    if (newItem.affixes && newItem.affixes.length > 0) {
        const primaryAffixRef = newItem.affixes[0].ref as keyof typeof statNameModifiers;
        const nameModifier = statNameModifiers[primaryAffixRef];

        if (nameModifier) {
            if (finalName.includes('{prefix_stat}')) {
                finalName = finalName.replace('{prefix_stat}', nameModifier.prefix);
            }
            if (finalName.includes('{suffix_stat}')) {
                finalName = finalName.replace('{suffix_stat}', nameModifier.suffix);
            }
        }
    }

    // 3. Clean up any unreplaced placeholders and extra spaces
    finalName = finalName.replace(/{\w+}/g, '').replace(/\s+/g, ' ').trim();
    newItem.name = finalName;

    return newItem;
};
