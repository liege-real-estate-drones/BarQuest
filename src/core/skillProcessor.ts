// ====================================================================================
// NOTE FOR FUTURE DEVS:
// This file is the central processing unit for all player skills.
// The goal is to make all skills "data-driven" by defining their effects
// purely in the `skills.json` file.
//
// The `processSkill` function currently has two main sections:
// 1. NEW DATA-DRIVEN LOGIC: This is the target model. It reads the `effects`
//    array from the skill's JSON definition and applies them.
// 2. OLD LOGIC: This is a fallback for skills that have not yet been
//    converted. It relies on string matching from the `effets` text field,
//    which is brittle and should be phased out.
//
// To implement a new skill or fix an old one:
// - Define its complete effects in `public/data/skills.json` using the
//   structured `effects` array.
// - Add any new, unhandled effect types to the `processSkill` function below.
// - Once a skill is fully data-driven, remove any hardcoded fallback
//   logic for it in the "OLD LOGIC" section.
// ====================================================================================

import type { WritableDraft } from 'immer/dist/internal';
import type { GameState } from '@/state/gameStore';
import * as formulas from '@/core/formulas';
import type { Buff, Debuff, Stats } from '@/lib/types';

const getModifiedStats = (baseStats: Stats, buffs: (Buff | Debuff)[], form?: string | null): Stats => {
    const modifiedStats: Stats = { ...baseStats };
    // Create a deep copy of ResElems to avoid nested mutation issues with Immer
    if (modifiedStats.ResElems) {
        modifiedStats.ResElems = { ...modifiedStats.ResElems };
    }

    const allMods = buffs.flatMap(b => b.statMods || []);

    allMods.filter(mod => mod.modifier === 'multiplicative').forEach(mod => {
        const statKey = mod.stat as keyof Stats;
        const statValue = modifiedStats[statKey];
        if (typeof statValue === 'number') {
            (modifiedStats[statKey] as number) *= mod.value;
        }
    });

    allMods.filter(mod => mod.modifier === 'additive').forEach(mod => {
        const statKey = mod.stat as keyof Stats;
        const statValue = modifiedStats[statKey];
        if (typeof statValue === 'number') {
            (modifiedStats[statKey] as number) += mod.value;
        }
    });

    if (form === 'shadow') {
        modifiedStats.ShadowDamageMultiplier = (modifiedStats.ShadowDamageMultiplier || 1) * 1.15;
        modifiedStats.DamageReductionMultiplier = (modifiedStats.DamageReductionMultiplier || 1) * 0.85;
    }

    return modifiedStats;
}

const getRankValue = (value: number | number[] | undefined, rank: number): number => {
    if (Array.isArray(value)) {
        // rank is 1-based, array is 0-based
        return value[Math.min(rank - 1, value.length - 1)] || 0;
    }
    return value || 0;
};

export const processSkill = (
    state: WritableDraft<GameState>,
    skillId: string,
    get: () => GameState,
    applySpecialEffect: (trigger: string, context: { targetId: string, isCrit: boolean }) => void
): { deadEnemyIds: string[] } => {
    const deadEnemyIds: string[] = [];
    const { player, combat, gameData } = state;
    const rank = player.learnedSkills[skillId];
    const skill = gameData.skills.find(t => t.id === skillId);

    if (!skill || !rank) return { deadEnemyIds };

    if (player.form === 'shadow' && skill.school === 'holy') {
        combat.log.push({ message: "Vous ne pouvez pas utiliser de sorts Sacrés en Forme d'ombre.", type: 'info', timestamp: Date.now() });
        return { deadEnemyIds };
    }
    if (player.stunDuration > 0) {
        combat.log.push({ message: "Vous êtes étourdi et ne pouvez pas agir.", type: 'info', timestamp: Date.now() });
        return { deadEnemyIds };
    }
    if ((combat.skillCooldowns[skillId] || 0) > 0) {
        return { deadEnemyIds };
    }

    // NEW DATA-DRIVEN LOGIC
    if (skill.effects) {
        const costEffect = skill.effects.find(e => (e as any).type === 'resource_cost') as any;
        const resourceCost = costEffect ? getRankValue(costEffect.amount, rank) : 0;

        if (player.resources.current < resourceCost) {
            combat.log.push({ message: "Pas assez de ressource!", type: 'info', timestamp: Date.now() });
            return { deadEnemyIds };
        }

        let effectApplied = false;

        skill.effects.forEach(effect => {
            const anyEffect = effect as any;
            let targets: (WritableDraft<GameState>['combat']['enemies'][number])[] = [];
            const primaryTarget = combat.enemies[combat.targetIndex];

            if (anyEffect.target === 'all_enemies') {
                targets = state.combat.enemies.filter(e => e.stats.PV > 0);
            } else { // 'primary' or undefined
                if (primaryTarget && primaryTarget.stats.PV > 0) {
                    targets.push(primaryTarget);
                }
            }

            targets.forEach(target => {
                const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
                const debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs || []);

                let conditionsMet = true;
                if (anyEffect.conditions) {
                    if (anyEffect.conditions.targetHpLessThan && target.initialHp > 0) {
                        const hpPercent = (target.stats.PV / target.initialHp) * 100;
                        if (hpPercent >= anyEffect.conditions.targetHpLessThan) {
                            conditionsMet = false;
                        }
                    }
                }

                if (conditionsMet) {
                    if (anyEffect.type === 'damage') {
                        let damage = 0;
                        if (anyEffect.source === 'weapon') {
                            const baseDmg = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                            damage = baseDmg * getRankValue(anyEffect.multiplier, rank);
                        } else if (anyEffect.source === 'spell') {
                            const baseDmg = getRankValue(anyEffect.baseValue, rank);
                            damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(buffedPlayerStats));
                        }

                        const isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats.Esquive);
                        if (isCrit) {
                            applySpecialEffect('ON_CRITICAL_HIT', { targetId: target.id, isCrit });
                        }
                        applySpecialEffect('ON_HIT', { targetId: target.id, isCrit });

                        let finalDamage = isCrit ? damage * (buffedPlayerStats.CritDmg / 100) : damage;
                        finalDamage *= (buffedPlayerStats.DamageMultiplier || 1);
                        if (anyEffect.damageType === 'shadow') {
                            finalDamage *= (buffedPlayerStats.ShadowDamageMultiplier || 1);
                        }

                        const dr = formulas.calculateArmorDR(debuffedTargetStats.Armure, player.level);
                        const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                        target.stats.PV -= mitigatedDamage;
                        const msg = `Vous utilisez ${skill.nom} sur ${target.nom} pour ${mitigatedDamage} points de dégâts.`;
                        const critMsg = `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`;
                        combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                        effectApplied = true;
                        if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                    }
                    // ... other effect types like debuff
                }
            });

            // ... other non-targeted effects
        });

        if (effectApplied) {
            player.resources.current -= resourceCost;
            if (skill.cooldown) {
                combat.skillCooldowns[skillId] = skill.cooldown * 1000;
            }
            state.combat.playerAttackProgress = 0;
        }
        return { deadEnemyIds };
    }

    // OLD LOGIC IS NOW A FALLBACK
    // This part should be progressively removed as skills are converted.
    const getTalentEffectValue = (effect: string, rank: number): number => {
        const matches = effect.match(/([\d./]+)/);
        if (!matches) return 0;
        const values = matches[1].split('/').map(Number);
        return values[Math.min(rank - 1, values.length - 1)] || 0;
    };
    const resourceCostMatch = skill.effets.join(' ').match(/Coûte (\d+) (Rage|Mana|Énergie)/);
    const resourceCost = resourceCostMatch ? parseInt(resourceCostMatch[1], 10) : 0;

    if (player.resources.current < resourceCost) {
        combat.log.push({ message: "Pas assez de ressource!", type: 'info', timestamp: Date.now() });
        return { deadEnemyIds };
    }

    let effectApplied = false;
    const skillEffects = skill.effets.join(' ');
    // ... (The entire old logic block remains here for unconverted skills)
    if (skill.id === 'rogue_subtlety_stealth') {
        combat.isStealthed = true;
        player.activeBuffs.push({ id: 'stealth', name: 'Camouflage', duration: 10000 });
        combat.log.push({ message: "Vous vous camouflez dans l'ombre.", type: 'info', timestamp: Date.now() });
        if (state.combat.autoAttack) {
            state.combat.autoAttack = false;
        }
        effectApplied = true;
    }


    if (effectApplied) {
        if (combat.isStealthed && skill.id !== 'rogue_subtlety_stealth') {
            combat.isStealthed = false;
        }
        player.resources.current -= resourceCost;
        if (skill.cooldown) {
            combat.skillCooldowns[skillId] = skill.cooldown * 1000;
        }
        state.combat.playerAttackProgress = 0;
    }


    return { deadEnemyIds };
};
