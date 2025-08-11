import type { Stats, Monster } from '@/lib/types';

// Player formulas
export const calculateMaxHP = (level: number, stats: Stats): number => {
  return 100 + 20 * level + 10 * (stats.str || 0) + 5 * (stats.spi || 0);
};

export const calculateMaxMana = (level: number, stats: Stats): number => {
  return 50 + 15 * level + 10 * (stats.int || 0);
};

export const calculateAttackPower = (stats: Stats): number => {
  return 2 * (stats.str || 0);
};

export const calculateSpellPower = (stats: Stats): number => {
  return 2 * (stats.int || 0);
};

// Combat formulas
export const calculateAttackInterval = (weaponSpeed: number, hastePct: number): number => {
  return weaponSpeed / (1 + hastePct / 100);
};

export const calculateMeleeDamage = (min: number, max: number, attackPower: number): number => {
  const roll = min + Math.random() * (max - min);
  return roll * (1 + attackPower / 100);
};

export const calculateSpellDamage = (baseDamage: number, spellPower: number): number => {
  return baseDamage * (1 + spellPower / 100);
};

export const calculateArmorDR = (armor: number, enemyLevel: number): number => {
    const denominator = armor + (100 + 20 * enemyLevel);
    if (denominator === 0) return 0;
    return armor / denominator;
};

export const calculateResistanceDR = (resistance: number, enemyLevel: number): number => {
    const denominator = resistance + (100 + 20 * enemyLevel);
    if (denominator === 0) return 0;
    return resistance / denominator;
};

export const calculateCritChance = (dex: number, bonusCritChance: number): number => {
  const baseCrit = 5; // Assuming a 5% base crit chance
  return baseCrit + (dex * 0.1) + bonusCritChance;
};

export const isCriticalHit = (critChance: number): boolean => {
    return Math.random() * 100 < critChance;
}

export const CRIT_MULTIPLIER = 1.5;
