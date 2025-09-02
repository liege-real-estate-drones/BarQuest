import type { Stats, Rareté, Buff, Debuff } from '@/lib/types';

export const getModifiedStats = (baseStats: Stats, buffs: (Buff | Debuff)[], form?: string | null): Stats => {
    const modifiedStats: Stats = JSON.parse(JSON.stringify(baseStats));

    buffs.forEach(buff => {
        if (buff.statMods) {
            const stacks = buff.stacks || 1;
            buff.statMods.forEach(mod => {
                const statKey = mod.stat as keyof Stats;
                const statValue = modifiedStats[statKey];

                if (typeof statValue === 'number' && typeof mod.value === 'number') {
                    if (mod.modifier === 'additive') {
                        (modifiedStats[statKey] as number) += mod.value * stacks;
                    } else if (mod.modifier === 'multiplicative') {
                        if (mod.value !== 1) {
                            (modifiedStats[statKey] as number) *= (1 + ((mod.value - 1) * stacks));
                        }
                    } else if (mod.modifier === 'multiplicative_add') {
                        (modifiedStats[statKey] as number) *= (1 + (mod.value * stacks));
                    }
                }
            });
        }
    });

    if (form === 'shadow') {
        modifiedStats.ShadowDamageMultiplier = (modifiedStats.ShadowDamageMultiplier || 1) * 1.15;
        modifiedStats.DamageReductionMultiplier = (modifiedStats.DamageReductionMultiplier || 1) * 0.85;
    }

    return modifiedStats;
};


export const rarityMultiplier: Record<Rareté, number> = {
    "Commun": 1,
    "Magique": 1.5,
    "Rare": 2.5,
    "Épique": 5,
    "Légendaire": 10,
    "Unique": 20,
};

// Player formulas
export const calculateMaxHP = (level: number, stats: Stats): number => {
  // Base HP + STR bonus. Placeholder formula for now.
  return 100 + 20 * level + 10 * (stats.Force || 0) + 5 * (stats.Esprit || 0);
};

export const calculateMaxMana = (level: number, stats: Stats): number => {
  // Base Mana + INT bonus. Placeholder formula for now.
  return 50 + 15 * level + 10 * (stats.Intelligence || 0);
};

export const calculateAttackPower = (stats: Stats): number => {
  return 2 * (stats.Force || 0);
};

export const calculateSpellPower = (stats: Stats): number => {
  return 2 * (stats.Intelligence || 0);
};

// Combat formulas
export const calculateAttackInterval = (weaponSpeed: number, hastePct: number): number => {
  return weaponSpeed / (1 + hastePct / 100);
};

export const calculateAttackDamage = (
  stats: Stats,
  elementalDamage?: { type: string; min: number; max: number }
): { physical: number; elemental: { type: string; value: number } | null } => {
  const physical = Math.random() * (stats.AttMax - stats.AttMin) + stats.AttMin;

  if (elementalDamage) {
    const elementalValue = Math.random() * (elementalDamage.max - elementalDamage.min) + elementalDamage.min;
    return {
      physical: physical,
      elemental: {
        type: elementalDamage.type,
        value: elementalValue,
      },
    };
  }

  return { physical, elemental: null };
};

export const calculatePhysicalDamage = (min: number, max: number, attackPower: number): number => {
  const roll = min + Math.random() * (max - min);
  return roll + (attackPower / 4);
};

export const calculateSpellDamage = (baseDamage: number, spellPower: number): number => {
  return baseDamage * (1 + spellPower / 100);
};

export const calculateElementalDamage = (elementalDamage: number, resistance: number): number => {
    const resistanceValue = Math.max(0, Math.min(100, resistance));
    return Math.round(elementalDamage * (1 - resistanceValue / 100));
};

export const calculateArmorDR = (armor: number, enemyLevel: number): number => {
    const denominator = armor + (100 + 20 * enemyLevel);
    if (denominator === 0) return 0;
    const dr = armor / denominator;
    return Math.min(dr, 0.75); // Cap DR at 75%
};

export const calculateResistanceDR = (resistance: number, enemyLevel: number): number => {
    const denominator = resistance + (100 + 20 * enemyLevel);
    if (denominator === 0) return 0;
    const dr = resistance / denominator;
    return Math.min(dr, 0.75); // Cap DR at 75%
};

export const calculateCritChance = (critPct: number, precision: number, targetStats: Stats): number => {
  const hitChance = Math.min(100, precision - targetStats.Esquive) / 100;
  if(Math.random() > hitChance) return 0; // The attack missed, so it can't crit

  const finalCritChance = critPct + (targetStats.CritChanceTakenModifier || 0);
  return finalCritChance;
};

export const isCriticalHit = (critChance: number, precision: number, targetStats: Stats, player: any, gameData: any): boolean => {
    let finalCritChance = calculateCritChance(critChance, precision, targetStats);

    const executionerRank = player.learnedTalents['rogue_assassinat_execution_sommaire'];
    if (executionerRank && executionerRank > 0) {
        const targetHpPercent = (targetStats.PV / (targetStats.MaxHP || targetStats.PV)) * 100;
        if (targetHpPercent < 35) {
            finalCritChance += 25;
        }
    }

    return Math.random() * 100 < finalCritChance;
}

export const scaleAffixValue = (baseValue: number, level: number): number => {
    return Math.round(baseValue + (baseValue * level * 0.1) + (level * 0.5));
};

export const getRankValue = (values: number[] | number | undefined | null, rank: number): number => {
    if (values === undefined || values === null) {
        return 0;
    }
    if (typeof values === 'number') {
        return values;
    }
    return values[Math.min(rank - 1, values.length - 1)] || 0;
};

export const getSkillResourceCost = (skill: any, player: any, gameData: any): number => {
    if (!skill || !skill.effects) return 0;

    const rank = player.learnedSkills[skill.id] || 1;
    let baseCost = 0;

    const costEffect = skill.effects.find((e: any) => e.type === 'resource_cost');
    if (costEffect) {
        baseCost = getRankValue(costEffect.amount, rank);
    }

    const stackingCostEffect = skill.effects.find((e: any) => e.type === 'stacking_damage_and_cost');
    if (stackingCostEffect) {
        const existingBuff = player.activeBuffs.find((b: any) => b.id === stackingCostEffect.stacking_buff.id);
        const currentStacks = existingBuff ? (existingBuff.stacks || 0) : 0;
        baseCost = stackingCostEffect.cost.base_amount * (1 + (currentStacks * stackingCostEffect.cost.stack_multiplier));
    }

    // Apply cost reduction talents
    const manaEfficientRank = player.learnedTalents['mage_arcane_mana_efficace'];
    if (manaEfficientRank > 0) {
        const talent = gameData.talents.find((t: any) => t.id === 'mage_arcane_mana_efficace');
        if (talent) {
            const reductionPercent = getRankValue(talent.effects[0].statMods[0].value, manaEfficientRank);
            baseCost *= (1 - reductionPercent);
        }
    }

    return Math.round(baseCost);
}

export const CRIT_MULTIPLIER = 1.5;
