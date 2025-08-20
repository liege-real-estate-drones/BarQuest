import type { Stats } from '@/lib/types';

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

export const calculateMeleeDamage = (min: number, max: number, attackPower: number): number => {
  const roll = min + Math.random() * (max - min);
  // Attack power now provides a more significant boost to melee damage.
  return roll + (attackPower / 4);
};

export const calculateSpellDamage = (baseDamage: number, spellPower: number): number => {
  return baseDamage * (1 + spellPower / 100);
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

export const calculateCritChance = (critPct: number, precision: number, targetDodge: number): number => {
  const hitChance = Math.min(100, precision - targetDodge) / 100;
  if(Math.random() > hitChance) return 0; // The attack missed, so it can't crit
  return critPct;
};

export const isCriticalHit = (critChance: number, precision: number, targetDodge: number): boolean => {
    const finalCritChance = calculateCritChance(critChance, precision, targetDodge);
    return Math.random() * 100 < finalCritChance;
}

export const scaleAffixValue = (baseValue: number, level: number): number => {
    return Math.round(baseValue + (baseValue * level * 0.1) + (level * 0.5));
};

export const CRIT_MULTIPLIER = 1.5;
