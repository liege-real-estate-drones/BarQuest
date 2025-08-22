// src/core/itemGenerator.ts
import type { Item, Rareté, Affixe, ItemGenerationContext, Dungeon } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import nameAffixesData from '../../public/data/nameAffixes.json';
import { NameAffixesSchema } from '@/data/schemas';
import * as formulas from '@/core/formulas';

// --- NEW: Data-driven name generation ---
const nameAffixes = NameAffixesSchema.parse(nameAffixesData);

/**
 * Selects a random element from an array.
 * @param arr The array to select from.
 * @returns A random element from the array, or undefined if the array is empty.
 */
const selectRandom = <T>(arr: T[]): T | undefined => {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
};

/**
 * Generates a grammatically correct and thematically coherent name for a loot item.
 * @param baseItem The base item object, must include name, gender, and plural status.
 * @param context The context for generation, including rarity, biome, and monster type.
 * @returns A generated name string.
 */
export const generateLootItemName = (
    baseItem: Pick<Item, 'name' | 'gender' | 'isPlural'>,
    context: ItemGenerationContext
): string => {
    const { rarity, tags } = context;
    const gender = baseItem.gender || 'm';
    const isPlural = baseItem.isPlural || false;

    // Determine the correct grammatical form key (ms, fs, mp, fp)
    const formKey = `${gender}${isPlural ? 'p' : 's'}` as 'ms' | 'fs' | 'mp' | 'fp';

    let availablePrefixes = nameAffixes.prefixes.filter(p => p.tags.some(t => tags.includes(t)));
    let availableSuffixesAdj = nameAffixes.suffixes_adjectives.filter(s => s.tags.some(t => tags.includes(t)));
    let availableSuffixesQual = nameAffixes.suffixes_qualifiers.filter(s => s.tags.some(t => tags.includes(t)));

    let prefix: { ms: string; fs: string; mp: string; fp: string; tags: string[] } | undefined;
    let suffixAdj: { ms: string; fs: string; mp: string; fp: string; tags: string[] } | undefined;
    let suffixQual: { text: string; tags: string[] } | undefined;

    const affixCountRoll = Math.random();
    let affixCount = 0;
    if (rarity === 'Magique') {
        affixCount = 1;
    } else if (rarity === 'Rare') {
        if (affixCountRoll < 0.7) affixCount = 1;
        else affixCount = 2;
    } else if (rarity === 'Épique' || rarity === 'Légendaire') {
        if (affixCountRoll < 0.2) affixCount = 1;
        else affixCount = 2;
    }

    const usedTags: Set<string> = new Set();
    let detectedQuality: 'positive' | 'negative' | null = null;

    const findQuality = (tags: string[]) => {
        if (tags.includes('quality:positive')) return 'positive';
        if (tags.includes('quality:negative')) return 'negative';
        return null;
    };

    if (affixCount > 0) {
        const affixChoiceRoll = Math.random();
        if (affixCount === 1) {
            if (affixChoiceRoll < 0.5) {
                prefix = selectRandom(availablePrefixes);
            } else if (affixChoiceRoll < 0.8) {
                suffixAdj = selectRandom(availableSuffixesAdj);
            } else {
                suffixQual = selectRandom(availableSuffixesQual);
            }
        } else if (affixCount === 2) {
            prefix = selectRandom(availablePrefixes);
            if (prefix) {
                const usedTag = prefix.tags.find(t => tags.includes(t));
                if (usedTag) usedTags.add(usedTag);
                detectedQuality = findQuality(prefix.tags);
            }

            if (detectedQuality) {
                const oppositeQuality = `quality:${detectedQuality === 'positive' ? 'negative' : 'positive'}`;
                availablePrefixes = availablePrefixes.filter(p => !p.tags.includes(oppositeQuality));
                availableSuffixesAdj = availableSuffixesAdj.filter(s => !s.tags.includes(oppositeQuality));
                availableSuffixesQual = availableSuffixesQual.filter(s => !s.tags.includes(oppositeQuality));
            }

            const suffixChoiceRoll = Math.random();
            if (suffixChoiceRoll < 0.5) {
                suffixAdj = selectRandom(availableSuffixesAdj.filter(s => !s.tags.some(t => usedTags.has(t))));
            } else {
                suffixQual = selectRandom(availableSuffixesQual.filter(s => !s.tags.some(t => usedTags.has(t))));
            }
        }
    }

    // Intelligent Name Assembly
    let finalName = baseItem.name;
    const materialRegex = /( en | de | d'| de la )(.+)$/i;
    const match = finalName.match(materialRegex);

    let baseNamePart = finalName;
    let materialPart = "";

    if (match && match.index) {
        baseNamePart = finalName.substring(0, match.index).trim();
        materialPart = finalName.substring(match.index).trim();
    }

    // Correction de l'assemblage pour une meilleure grammaire
    let adjectives: string[] = [];
    if (prefix) {
        adjectives.push(prefix[formKey]);
    }
    if (suffixAdj) {
        adjectives.push(suffixAdj[formKey]);
    }

    finalName = baseNamePart;
    if (adjectives.length > 0) {
        finalName += ` ${adjectives.join(' ')}`;
    }

    if (materialPart) {
        finalName += ` ${materialPart}`;
    }

    if (suffixQual) {
        finalName += ` ${suffixQual.text}`;
    }

    return finalName.replace(/\s+/g, ' ').trim(); // Nettoyer les espaces multiples
};

// --- END NEW ---


export const generateProceduralItem = (
    baseItem: Omit<Item, 'id' | 'niveauMin' | 'rarity'>,
    itemLevel: number,
    rarity: Rareté,
    availableAffixes: Affixe[],
    dungeon?: Dungeon, // Passez l'objet donjon entier pour plus de contexte
): Item => {
    // Si l'objet n'est pas un équipement standard, retournez-le tel quel.
    if (baseItem.type === 'quest' || !baseItem.slot) {
        return { ...baseItem, id: uuidv4(), niveauMin: itemLevel, rarity: rarity };
    }

    const newItem: Item = {
        ...baseItem,
        id: uuidv4(),
        niveauMin: itemLevel,
        rarity: rarity,
        affixes: [],
        vendorPrice: baseItem.vendorPrice
            ? Math.round(baseItem.vendorPrice * (formulas.rarityMultiplier[rarity] || 1))
            : itemLevel * 2,
    };

    const rarityAffixCount: Record<Rareté, [number, number]> = {
        "Commun": [0, 1],
        "Magique": [1, 2],
        "Rare": [2, 3],
        "Épique": [3, 4],
        "Légendaire": [0, 0],
        "Unique": [0, 0],
    };

    const [minAffixes, maxAffixes] = rarityAffixCount[rarity] || [0, 0];
    const numAffixes = Math.floor(Math.random() * (maxAffixes - minAffixes + 1)) + minAffixes;

    if (numAffixes > 0 && availableAffixes.length > 0) {
        // --- NOUVELLE LOGIQUE DE SCORE ---

        // 1. Poids du biome (influence de la zone)
        const biomeTagWeights: Record<string, number> = { [dungeon?.biome || '']: 20 };

        const scoredAffixes = availableAffixes.map(affix => {
            let score = 1; // Score de base

            // 2. Calculer le score thématique de l'affixe basé sur le biome
            affix.tags?.forEach(tag => {
                score += biomeTagWeights[tag] || 0;
            });

            // 3. BONUS DE COHÉRENCE (la partie la plus importante)
            // Si un tag de l'affixe correspond à un tag de l'objet de base, on booste le score.
            const coherenceBonus = 50; // Augmentez cette valeur pour des objets encore plus cohérents
            if (affix.tags?.some(tag => baseItem.tags?.includes(tag))) {
                score *= coherenceBonus;
            }

            return { affix, score };
        });

        // 4. Sélectionner les affixes en utilisant les scores comme poids
        const selectedAffixes: Affixe[] = [];
        const affixPool = [...scoredAffixes];

        for (let i = 0; i < numAffixes && affixPool.length > 0; i++) {
            const totalScore = affixPool.reduce((sum, current) => sum + current.score, 0);
            let randomPick = Math.random() * totalScore;

            for (let j = 0; j < affixPool.length; j++) {
                randomPick -= affixPool[j].score;
                if (randomPick <= 0) {
                    selectedAffixes.push(affixPool[j].affix);
                    affixPool.splice(j, 1); // Empêche de tirer le même affixe plusieurs fois
                    break;
                }
            }
        }

        // 5. Appliquer les affixes choisis à l'objet
        newItem.affixes = selectedAffixes.map(affix => {
            const [min, max] = affix.portée;
            const baseValue = Math.floor(Math.random() * (max - min + 1)) + min;
            const scaledValue = formulas.scaleAffixValue(baseValue, itemLevel);
            return { ref: affix.ref, val: scaledValue };
        });
    }

    // Générer un nom cohérent après avoir choisi les affixes
    const finalAffixTags = newItem.affixes?.flatMap(a => availableAffixes.find(af => af.ref === a.ref)?.tags || []) || [];
    const contextTags = [...new Set([...(baseItem.tags || []), ...finalAffixTags])];

    newItem.name = generateLootItemName(newItem, { rarity: rarity, tags: contextTags });

    return newItem;
};
