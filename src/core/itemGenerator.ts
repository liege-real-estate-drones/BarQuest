// src/core/itemGenerator.ts
import type { Item, Rareté, Affixe } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import nameModifiersData from '../../public/data/nameModifiers.json';

const { affixes: nameModifiers, qualifiers, materials } = nameModifiersData;

const rarityAffixCount: Record<Rareté, [number, number]> = {
    "Commun": [0, 1],
    "Rare": [1, 2],
    "Épique": [3, 4],
    "Légendaire": [0, 0], // Legendary items are predefined
    "Unique": [0, 0], // Unique items are predefined
};

const scaleAffixValue = (baseValue: number, level: number): number => {
    // A simple scaling formula, can be improved
    return Math.round(baseValue + (baseValue * level * 0.1) + (level * 0.5));
};

export const generateProceduralItem = (
    baseItem: Omit<Item, 'id' | 'niveauMin' | 'rarity'>,
    itemLevel: number,
    rarity: Rareté,
    availableAffixes: Affixe[]
): Item => {
    // --- Qualifier Selection and Stat Application ---
    const qualifierNames = Object.keys(qualifiers);
    const randomQualifierName = qualifierNames[Math.floor(Math.random() * qualifierNames.length)];
    const qualifierMod = (qualifiers as Record<string, number>)[randomQualifierName];

    const newItem: Item = {
        ...baseItem,
        id: uuidv4(),
        niveauMin: itemLevel,
        rarity: rarity,
        affixes: [],
        // Apply qualifier modifier to base value
        valeur: Math.round(baseItem.valeur * qualifierMod),
    };

    const [minAffixes, maxAffixes] = rarityAffixCount[rarity];
    const numAffixes = Math.floor(Math.random() * (maxAffixes - minAffixes + 1)) + minAffixes;

    if (numAffixes > 0) {
        const shuffledAffixes = [...availableAffixes].sort(() => 0.5 - Math.random());
        const selectedAffixes = shuffledAffixes.slice(0, numAffixes);

        newItem.affixes = selectedAffixes.map(affix => {
            const [min, max] = affix.portée;
            const baseValue = Math.floor(Math.random() * (max - min + 1)) + min;
            const scaledValue = scaleAffixValue(baseValue, itemLevel);
            return { ref: affix.ref, val: scaledValue };
        });
    }

    // --- Dynamic Name Generation ---
    let finalName = `${randomQualifierName} ${newItem.name}`;

    // --- Material Selection ---
    const suitableMaterial = [...materials]
        .sort((a, b) => a.level - b.level)
        .filter(m => m.level <= itemLevel)
        .pop();

    if (suitableMaterial) {
        finalName = `${finalName} ${suitableMaterial.name}`;
    }

    // --- Affix Suffix ---
    if (newItem.affixes && newItem.affixes.length > 0 && (rarity === "Rare" || rarity === "Épique")) {
        const primaryAffix = newItem.affixes[0];
        const modifier = (nameModifiers as Record<string, { prefix: string, suffix: string }>)[primaryAffix.ref];

        if (modifier) {
            // Always add suffix for Rare and Epic
            finalName = `${finalName} ${modifier.suffix}`;
        }
    }

    newItem.name = finalName;

    return newItem;
};
