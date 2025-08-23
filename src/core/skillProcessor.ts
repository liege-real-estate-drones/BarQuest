import type { WritableDraft } from 'immer';
import type { GameState } from '@/state/gameStore';
import * as formulas from '@/core/formulas';
import { getRankValue, getModifiedStats } from '@/core/formulas';
import type { Buff, Debuff, Stats } from '@/lib/types';
import { SkillEffectSchema } from '@/data/schemas';


export const processSkill = (
    state: WritableDraft<GameState>,
    skillId: string,
    get: () => GameState,
    applySpecialEffect: (trigger: string, context: { targetId: string, isCrit: boolean, skill?: any }) => void
): { deadEnemyIds: string[] } => {
    const deadEnemyIds: string[] = [];
    const { player, combat, gameData } = state;
    const rank = player.learnedSkills[skillId];
    const originalSkill = gameData.skills.find(t => t.id === skillId);

    if (!originalSkill || !rank) return { deadEnemyIds };

    let skill = JSON.parse(JSON.stringify(originalSkill));
    Object.entries(player.learnedTalents).forEach(([talentId, talentRank]) => {
        const talentData = gameData.talents.find(t => t.id === talentId);
        if (talentData?.skill_mods) {
            talentData.skill_mods.forEach(mod => {
                if (mod.skill_id === skillId && skill.effects) {
                    mod.modifications.forEach(m => {
                        if (skill.effects[m.effect_index]) {
                            const effectToModify = skill.effects[m.effect_index] as Record<string, any>;
                            if (effectToModify[m.property_path]) {
                                const baseValue = getRankValue((originalSkill.effects![m.effect_index] as any)[m.property_path], rank);
                                const talentModValue = getRankValue(m.value, talentRank);
                                if (m.modifier === 'multiplicative') effectToModify[m.property_path] = baseValue * talentModValue;
                                else if (m.modifier === 'additive') effectToModify[m.property_path] = baseValue + talentModValue;
                            }
                        }
                    });
                }
            });
        }
    });

    if (player.form === 'shadow' && skill.school === 'holy') {
        combat.log.push({ message: "Vous ne pouvez pas utiliser de sorts Sacrés en Forme d'ombre.", type: 'info', timestamp: Date.now() });
        return { deadEnemyIds };
    }
    if (player.stunDuration > 0) {
        combat.log.push({ message: "Vous êtes étourdi et ne pouvez pas agir.", type: 'info', timestamp: Date.now() });
        return { deadEnemyIds };
    }
    if ((combat.skillCooldowns[skillId] || 0) > 0) return { deadEnemyIds };

    if (skillId !== 'mage_arcane_blast') {
        const arcaneChargeIndex = state.player.activeBuffs.findIndex(b => b.id === 'arcane_charge');
        if (arcaneChargeIndex > -1) state.player.activeBuffs.splice(arcaneChargeIndex, 1);
    }

    const hasArchonBuff = player.activeBuffs.some(b => b.id === 'archon_buff');

    if (skill.effects) {
        let effectApplied = false;
        let skillFailed = false;
        let dynamicResourceCost = formulas.getSkillResourceCost(skill, player, gameData);

        if (!hasArchonBuff && player.resources.current < dynamicResourceCost) {
            combat.log.push({ message: "Pas assez de ressource!", type: 'info', timestamp: Date.now() });
            return { deadEnemyIds };
        }

        for (const effect of skill.effects) {
            if (skillFailed) break;
            const anyEffect = effect as any;
            let targets: (WritableDraft<GameState>['combat']['enemies'][number])[] = [];
            const primaryTarget = combat.enemies[combat.targetIndex];

            if (anyEffect.type === 'heal' || anyEffect.type === 'buff') {
                // Self-target effects
            } else if (anyEffect.target === 'all_enemies') {
                targets = state.combat.enemies.filter(e => e.stats.PV > 0);
            } else {
                if (primaryTarget && primaryTarget.stats.PV > 0) targets.push(primaryTarget);
            }
            if(targets.length === 0 && anyEffect.type !== 'heal' && anyEffect.type !== 'buff' && anyEffect.type !== 'resource_cost') continue;

            const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);

            const handleDamage = (target: any, damageEffect: any, damageMultiplier: number = 1) => {
                let damage = 0;
                if (damageEffect.source === 'weapon') {
                    const baseDmg = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                    damage = baseDmg * getRankValue(damageEffect.multiplier, rank);
                    damage += getRankValue(damageEffect.bonus_flat_damage, rank);
                } else if (damageEffect.source === 'spell') {
                    const baseDmg = getRankValue(damageEffect.baseValue, rank);
                    damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(buffedPlayerStats));
                }

                damage *= damageMultiplier;
                if (hasArchonBuff) damage *= 2;

                const debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs || []);

                if (player.activeBuffs.some(b => b.id === 'coeur_de_l_hiver_buff') && damageEffect.damageType === 'ice') {
                    target.activeDebuffs.push({
                        id: 'coeur_de_l_hiver_freeze',
                        name: 'Gelé par Coeur de l\'Hiver',
                        duration: 3000, // 3s freeze
                        isDebuff: true,
                        // This is a CC effect, but we don't need to specify the type for the logic to work
                    });
                     combat.log.push({ message: `Le Coeur de l'Hiver gèle ${target.nom} !`, type: 'talent_proc', timestamp: Date.now() });
                }

                if (damageEffect.conditional_damage_multiplier) {
                    const c = damageEffect.conditional_damage_multiplier;
                    if (c.condition === 'target_hp_less_than') {
                        const hpPercent = (target.stats.PV / target.initialHp) * 100;
                        if (hpPercent < c.threshold) {
                            damage *= c.multiplier;
                        }
                    }
                }
                const isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats, player, gameData);
                if (isCrit) applySpecialEffect('ON_CRITICAL_HIT', { targetId: target.id, isCrit, skill: skill });
                applySpecialEffect('ON_HIT', { targetId: target.id, isCrit, skill: skill });

                let finalDamage = isCrit ? damage * (buffedPlayerStats.CritDmg / 100) : damage;
                finalDamage *= (buffedPlayerStats.DamageMultiplier || 1);
                if (damageEffect.damageType === 'shadow') finalDamage *= (buffedPlayerStats.ShadowDamageMultiplier || 1);
                if (damageEffect.damageType === 'ice') finalDamage *= (buffedPlayerStats.IceDamageMultiplier || 1);

                const dr = formulas.calculateArmorDR(debuffedTargetStats.Armure, player.level);
                const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                target.stats.PV -= mitigatedDamage;
                return { mitigatedDamage, isCrit };
            }

            if (anyEffect.type === 'damage') {
                targets.forEach(target => {
                    const { mitigatedDamage, isCrit } = handleDamage(target, anyEffect);
                    combat.log.push({ message: isCrit ? `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${target.nom}.` : `Vous utilisez ${skill.nom} sur ${target.nom} pour ${mitigatedDamage} points de dégâts.`, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                    if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                });
                effectApplied = true;
            } else if (anyEffect.type === 'debuff') {
                targets.forEach(target => {
                    if (anyEffect.debuffType === 'dot') {
                        let totalDamage = 0;
                        if (anyEffect.totalDamage.source === 'spell') totalDamage = formulas.calculateSpellDamage(getRankValue(anyEffect.totalDamage.baseValue, rank), formulas.calculateSpellPower(buffedPlayerStats));
                        else {
                            const baseDmg = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                            totalDamage = baseDmg * getRankValue(anyEffect.totalDamage.multiplier, rank);
                        }
                        if (hasArchonBuff) totalDamage *= 2;
                        const numTicks = anyEffect.num_ticks || anyEffect.duration;
                        target.activeDebuffs.push({ id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration * 1000, damagePerTick: Math.round(totalDamage / numTicks), tickInterval: (anyEffect.duration * 1000) / numTicks, nextTickIn: (anyEffect.duration * 1000) / numTicks, isDebuff: true, damageType: anyEffect.damageType });
                        combat.log.push({ message: `Votre ${skill.nom} afflige ${target.nom}.`, type: 'player_attack', timestamp: Date.now() });
                    } else if (anyEffect.debuffType === 'stat_modifier') {
                        const newDebuff: Debuff = {
                            id: anyEffect.id,
                            name: anyEffect.name,
                            duration: anyEffect.duration * 1000,
                            isDebuff: true,
                            statMods: anyEffect.statMods,
                        };
                        target.activeDebuffs = target.activeDebuffs || [];
                        target.activeDebuffs.push(newDebuff);
                        combat.log.push({ message: `${target.nom} est affecté par ${skill.nom}.`, type: 'info', timestamp: Date.now() });
                    } else if (anyEffect.debuffType === 'cc') {
                        if (anyEffect.ccType === 'stun') {
                            target.stunDuration = (target.stunDuration || 0) + (anyEffect.duration * 1000);
                            combat.log.push({ message: `${target.nom} est étourdi par ${skill.nom}.`, type: 'info', timestamp: Date.now() });
                        }
                    }
                });
                effectApplied = true;
            } else if (anyEffect.type === 'shield') {
                let shieldAmount = 0;
                if (anyEffect.amount.source === 'spell_power') {
                    shieldAmount = formulas.calculateSpellDamage(getRankValue(anyEffect.amount.multiplier, rank), formulas.calculateSpellPower(buffedPlayerStats));
                } else { // base_value
                    shieldAmount = getRankValue(anyEffect.amount.multiplier, rank);
                }
                player.shield += shieldAmount;
                combat.log.push({ message: `Vous gagnez un bouclier de ${shieldAmount} points.`, type: 'shield', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'invulnerability') {
                player.invulnerabilityDuration = (player.invulnerabilityDuration || 0) + (anyEffect.duration * 1000);
                combat.log.push({ message: `Vous devenez invulnérable pendant ${anyEffect.duration} secondes.`, type: 'info', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'death_ward') {
                const newBuff: Buff = {
                    id: skill.id,
                    name: skill.nom,
                    duration: anyEffect.duration * 1000,
                    isDeathWard: true,
                    deathWardHealPercent: anyEffect.heal_percent,
                };
                player.activeBuffs.push(newBuff);
                combat.log.push({ message: `${skill.nom} vous protège de la mort.`, type: 'info', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'buff') {
                const newBuff: Buff = { id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration, stacks: 1 };
                if (anyEffect.buffType === 'hot' && anyEffect.totalHealing) {
                    let totalHealing = 0;
                    if (anyEffect.totalHealing.source === 'base_value') {
                        totalHealing = getRankValue(anyEffect.totalHealing.multiplier, rank);
                    } else if (anyEffect.totalHealing.source === 'spell_power') {
                        totalHealing = formulas.calculateSpellDamage(getRankValue(anyEffect.totalHealing.multiplier, rank), formulas.calculateSpellPower(buffedPlayerStats));
                    }
                    newBuff.tickInterval = 1000; // Assume 1s tick for now
                    newBuff.nextTickIn = 1000;
                    newBuff.healingPerTick = Math.round(totalHealing / (anyEffect.duration / 1000));
                }
                player.activeBuffs.push(newBuff);
                if (anyEffect.id === 'stealth') {
                    state.combat.isStealthed = true;
                }
                if (anyEffect.id === 'last_stand_buff') {
                    const hpIncreasePercent = getRankValue((anyEffect.statMods[0] as any).value, rank);
                    const currentHp = player.stats.PV;
                    const maxHp = formulas.calculateMaxHP(player.level, player.stats);
                    const newMaxHp = maxHp * (1 + hpIncreasePercent);
                    player.stats.PV = (currentHp / maxHp) * newMaxHp;
                }
                combat.log.push({ message: `Vous utilisez ${skill.nom}.`, type: 'info', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'heal') {
                let totalHeal = 0;
                if (anyEffect.source === 'spell') totalHeal = formulas.calculateSpellDamage(getRankValue(anyEffect.baseValue, rank), formulas.calculateSpellPower(buffedPlayerStats));
                totalHeal *= (buffedPlayerStats.HealingMultiplier || 1);
                totalHeal *= (buffedPlayerStats.HealingReceivedMultiplier || 1);
                const maxHp = formulas.calculateMaxHP(player.level, player.stats);
                const oldHp = player.stats.PV;
                player.stats.PV = Math.min(maxHp, player.stats.PV + totalHeal);
                combat.log.push({ message: `Votre ${skill.nom} vous soigne de ${Math.round(player.stats.PV - oldHp)} PV.`, type: 'heal', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'consume_debuff_for_damage') {
                targets.forEach(target => {
                    const debuffIndex = target.activeDebuffs.findIndex((d: any) => d.id === anyEffect.debuff_id_to_consume);
                    if (debuffIndex > -1) {
                        const debuff = target.activeDebuffs[debuffIndex];
                        const stacks = debuff.stacks || 1;
                        target.activeDebuffs.splice(debuffIndex, 1);
                        let totalDamage = stacks * anyEffect.damage_per_stack;
                        if (hasArchonBuff) totalDamage *= 2;
                        const debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs || []);
                        const isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats, player, gameData);
                        let finalDamage = isCrit ? totalDamage * (buffedPlayerStats.CritDmg / 100) : totalDamage;
                        const res = debuffedTargetStats.ResElems?.[anyEffect.damageType] || 0;
                        const elemDR = formulas.calculateResistanceDR(res, player.level);
                        const mitigatedDamage = Math.round(finalDamage * (1 - elemDR));
                        target.stats.PV -= mitigatedDamage;
                        combat.log.push({ message: `Vous consommez ${stacks} charges de poison pour infliger ${mitigatedDamage} dégâts de nature à ${target.nom}.`, type: 'player_attack', timestamp: Date.now() });
                        if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                        effectApplied = true;
                    } else {
                        combat.log.push({ message: `La cible n'est pas empoisonnée.`, type: 'info', timestamp: Date.now() });
                        skillFailed = true;
                    }
                });
            } else if (anyEffect.type === 'stacking_damage_and_cost') {
                targets.forEach(target => {
                    const existingBuff = player.activeBuffs.find(b => b.id === anyEffect.stacking_buff.id);
                    const currentStacks = existingBuff ? (existingBuff.stacks || 0) : 0;
                    const damageMultiplier = 1 + (currentStacks * anyEffect.damage.stack_multiplier);
                    const { mitigatedDamage, isCrit } = handleDamage(target, anyEffect.damage, damageMultiplier);
                    const newStacks = Math.min(anyEffect.stacking_buff.max_stacks, currentStacks + 1);
                    if (existingBuff) {
                        existingBuff.stacks = newStacks;
                        existingBuff.duration = anyEffect.stacking_buff.duration;
                    } else {
                        player.activeBuffs.push({ id: anyEffect.stacking_buff.id, name: anyEffect.stacking_buff.name, duration: anyEffect.stacking_buff.duration, stacks: 1 });
                    }
                    combat.log.push({ message: isCrit ? `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${target.nom}.` : `Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                    combat.log.push({ message: `Vous gagnez une charge de ${anyEffect.stacking_buff.name} (${newStacks}).`, type: 'info', timestamp: Date.now() });
                    if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                });
                effectApplied = true;
            } else if (anyEffect.type === 'transformation') {
                player.form = anyEffect.form;
                combat.log.push({ message: `Vous prenez une nouvelle forme: ${anyEffect.form}.`, type: 'info', timestamp: Date.now() });
                effectApplied = true;
            } else if (anyEffect.type === 'multi_strike') {
                targets.forEach(target => {
                    const strikes = getRankValue(anyEffect.strikes, rank);
                    for (let i = 0; i < strikes; i++) {
                        if (target.stats.PV <= 0) break;
                        const { mitigatedDamage, isCrit } = handleDamage(target, anyEffect.damage);
                        combat.log.push({ message: isCrit ? `CRITIQUE ! Votre ${skill.nom} (Frappe ${i + 1}) inflige ${mitigatedDamage} points de dégâts à ${target.nom}.` : `Votre ${skill.nom} (Frappe ${i + 1}) inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                        if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                    }
                });
                effectApplied = true;
            }
        }

        if (effectApplied && !skillFailed) {
            if (!hasArchonBuff) {
                player.resources.current -= dynamicResourceCost;
            }
            if (skill.cooldown) {
                combat.skillCooldowns[skillId] = skill.cooldown * 1000;
            }
            state.combat.playerAttackProgress = 0;
        }
        return { deadEnemyIds };
    }

    return { deadEnemyIds };
};
