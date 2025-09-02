# This script is for simulating combat scenarios to help with game balancing.
# It is a simplified simulation and has some limitations:
# - It does not account for cooldowns or resource costs.
# - It does not simulate a rotation of different skills.
# - It assumes a fixed number of debuff stacks for skills that consume them.
#
# To use this script, modify the `if __name__ == '__main__':` block to
# create characters, equip them with items, and run simulations.

import json
import random
import pprint
import os

# Get the directory of the script
script_dir = os.path.dirname(__file__)

# Construct absolute paths to the data files
def get_data_path(filename):
    return os.path.join(script_dir, '..', 'public', 'data', filename)

# Load data from JSON files
with open(get_data_path('items.json'), 'r') as f:
    items_data = json.load(f)

with open(get_data_path('monsters.json'), 'r') as f:
    monsters_data = json.load(f)

with open(get_data_path('skills.json'), 'r') as f:
    skills_data = json.load(f)

with open(get_data_path('classes.json'), 'r') as f:
    classes_data = json.load(f)

# Formulas from src/core/formulas.ts

def calculate_spell_power(stats, class_id):
    if class_id == 'cleric':
        return 1.5 * stats.get('Esprit', 0)
    return 2 * stats.get('Intelligence', 0)

def calculate_elemental_damage(elemental_damage, resistance):
    resistance_value = max(0, min(100, resistance))
    return round(elemental_damage * (1 - resistance_value / 100))

def calculate_player_attack_damage(stats):
    physical = random.uniform(stats.get('AttMin', 0), stats.get('AttMax', 0))
    elementals = []
    if stats.get('DmgElems'):
        for type, value in stats['DmgElems'].items():
            elementals.append({ 'type': type, 'value': value })
    return { 'physical': physical, 'elementals': elementals }

def get_rank_value(values, rank):
    if values is None:
        return 0
    if isinstance(values, (int, float)):
        return values
    return values[min(rank - 1, len(values) - 1)] or 0

def calculate_spell_damage(base_damage, spell_power, stats, damage_type):
    modified_base_damage = base_damage
    if stats.get('DmgElems') and stats['DmgElems'].get(damage_type):
        modified_base_damage += stats['DmgElems'][damage_type]
    return modified_base_damage * (1 + spell_power / 100)

class Character:
    def __init__(self, level, class_id):
        self.level = level
        self.class_id = class_id
        self.equipment = {}
        self.stats = self.get_base_stats()
        self.skills = self.get_skills()

    def get_base_stats(self):
        for class_info in classes_data['classes']:
            if class_info['id'] == self.class_id:
                return class_info['baseStats'].copy()
        return {}

    def get_skills(self):
        skills = []
        for skill in skills_data['skills']:
            if skill['classeId'] == self.class_id and skill['niveauRequis'] <= self.level:
                skills.append(skill)
        return skills

    def equip(self, item_id):
        for item in items_data['items']:
            if item['id'] == item_id:
                self.equipment[item['slot']] = item
                self.update_stats()
                break

    def update_stats(self):
        self.stats = self.get_base_stats()
        for item in self.equipment.values():
            if 'affixes' in item:
                for affix in item['affixes']:
                    keys = affix['ref'].split('.')
                    if len(keys) == 1:
                        self.stats[keys[0]] = self.stats.get(keys[0], 0) + affix['val']
                    else:
                        if keys[0] not in self.stats:
                            self.stats[keys[0]] = {}
                        self.stats[keys[0]][keys[1]] = self.stats[keys[0]].get(keys[1], 0) + affix['val']
            # Handle inconsistent "stats" block
            if 'stats' in item:
                for key, value in item['stats'].items():
                    if isinstance(value, dict):
                        if key not in self.stats:
                            self.stats[key] = {}
                        for sub_key, sub_value in value.items():
                            self.stats[key][sub_key] = self.stats[key].get(sub_key, 0) + sub_value
                    else:
                        self.stats[key] = self.stats.get(key, 0) + value


class Monster:
    def __init__(self, monster_id):
        for monster in monsters_data['monsters']:
            if monster['id'] == monster_id:
                self.id = monster['id']
                self.name = monster['nom']
                self.level = monster['level']
                self.stats = monster['stats']
                break

def simulate_combat(player, monster_id, skill_id, turns=100, debuff_stacks=0):
    monster = Monster(monster_id)
    total_damage = 0

    skill_to_use = None
    for skill in player.skills:
        if skill['id'] == skill_id:
            skill_to_use = skill
            break

    if not skill_to_use:
        print(f"Skill {skill_id} not found for class {player.class_id}")
        return 0

    skill_rank = skill_to_use.get('rangMax', 1)

    print(f"Simulating combat for a level {player.level} {player.class_id} vs {monster.name} using {skill_id} (rank {skill_rank}) with {debuff_stacks} stacks.")
    pp = pprint.PrettyPrinter(indent=4)
    print("Player stats:")
    pp.pprint(player.stats)
    print("Monster stats:")
    pp.pprint(monster.stats)


    for _ in range(turns):
        turn_damage = 0
        # Player's turn
        for effect in skill_to_use.get('effects', []):
            if effect.get('type') == 'damage':
                damage_effect = effect
                if damage_effect['source'] == 'weapon':
                    attack_damage = calculate_player_attack_damage(player.stats)

                    # Physical part
                    multiplier = get_rank_value(damage_effect.get('multiplier', 1), skill_rank)
                    bonus_flat_damage = get_rank_value(damage_effect.get('bonus_flat_damage', 0), skill_rank)
                    weapon_damage = attack_damage['physical'] * multiplier + bonus_flat_damage
                    armor_dr = calculate_armor_dr(monster.stats.get('Armure', 0), player.level)
                    mitigated_physical_damage = weapon_damage * (1 - armor_dr)
                    turn_damage += mitigated_physical_damage

                    # Elemental part from weapon
                    for elemental in attack_damage['elementals']:
                        resistance = monster.stats.get('ResElems', {}).get(elemental['type'], 0)
                        mitigated_elemental_damage = calculate_elemental_damage(elemental['value'], resistance)
                        turn_damage += mitigated_elemental_damage

                elif damage_effect['source'] == 'spell':
                    spell_power = calculate_spell_power(player.stats, player.class_id)
                    base_damage = get_rank_value(damage_effect['baseValue'], skill_rank)
                    damage_type = damage_effect['damageType']

                    spell_damage = calculate_spell_damage(base_damage, spell_power, player.stats, damage_type)

                    resistance = monster.stats.get('ResElems', {}).get(damage_type, 0)
                    mitigated_spell_damage = calculate_elemental_damage(spell_damage, resistance)
                    turn_damage += mitigated_spell_damage

            elif effect.get('type') == 'consume_debuff_for_damage':
                damage_per_stack = effect['damage_per_stack']
                damage_type = effect['damageType']

                consumed_damage = damage_per_stack * debuff_stacks

                resistance = monster.stats.get('ResElems', {}).get(damage_type, 0)
                mitigated_consumed_damage = calculate_elemental_damage(consumed_damage, resistance)
                turn_damage += mitigated_consumed_damage


        # Elemental damage from gear (applied on every damaging skill)
        if turn_damage > 0 and player.stats.get('DmgElems'):
            for dmg_type, dmg_value in player.stats['DmgElems'].items():
                resistance = monster.stats.get('ResElems', {}).get(dmg_type, 0)
                mitigated_elemental_damage = calculate_elemental_damage(dmg_value, resistance)
                turn_damage += mitigated_elemental_damage

        total_damage += turn_damage

    average_dps = total_damage / turns
    print(f"\nAverage DPS over {turns} turns: {average_dps:.2f}")
    return average_dps

def calculate_armor_dr(armor, enemy_level):
    denominator = armor + (100 + 20 * enemy_level)
    if denominator == 0:
        return 0
    dr = armor / denominator
    return min(dr, 0.75)


if __name__ == '__main__':
    print("--- General Simulations (Level 20) ---")
    print("\n--- Mage Simulations ---")
    player_mage = Character(level=20, class_id='mage')
    player_mage.equip('staff_of_the_comet_caller')
    player_mage.equip('apprentice_gloves')
    player_mage.equip('sash_of_the_adept')
    player_mage.equip('mages_circlet')
    player_mage.equip('amulet_fire_ruby')
    simulate_combat(player_mage, 'cinder_lord', 'mage_fire_fireball')
    simulate_combat(player_mage, 'frost_wolf', 'mage_fire_fireball')
    simulate_combat(player_mage, 'cinder_lord', 'mage_frost_frostbolt')

    print("\n--- Berserker Simulations ---")
    player_berserker = Character(level=20, class_id='berserker')
    player_berserker.equip('axe_of_the_deathbringer')
    simulate_combat(player_berserker, 'cinder_lord', 'berserker_heroic_strike')

    print("\n--- Rogue Simulations ---")
    player_rogue = Character(level=20, class_id='rogue')
    player_rogue.equip('kingslayers_fangs')
    player_rogue.equip('rogues_cowl')
    player_rogue.equip('set_shadow_shroud_tunic')
    simulate_combat(player_rogue, 'yeti_matriarch', 'rogue_assassination_envenom', debuff_stacks=5)

    print("\n--- Cleric Simulations ---")
    player_cleric = Character(level=20, class_id='cleric')
    player_cleric.equip('hammer_of_divine_light')
    player_cleric.equip('clerics_diadem')
    simulate_combat(player_cleric, 'ghoul', 'cleric_shadow_smite')

    print("\n\n--- Specialized Elemental Builds (Level 25) ---")

    print("\n--- Fire Mage Simulations ---")
    player_fire_mage = Character(level=25, class_id='mage')
    player_fire_mage.equip('staff_of_the_comet_caller')
    player_fire_mage.equip('rep_magma_callers_cowl')
    player_fire_mage.equip('amulet_fire_ruby')
    simulate_combat(player_fire_mage, 'cinder_lord', 'mage_fire_fireball')
    simulate_combat(player_fire_mage, 'frost_wolf', 'mage_fire_fireball')

    print("\n--- Shadow Rogue Simulations ---")
    player_shadow_rogue = Character(level=25, class_id='rogue')
    player_shadow_rogue.equip('kingslayers_fangs')
    player_shadow_rogue.equip('set_shadow_shroud_mask')
    player_shadow_rogue.equip('shadow_gem_amulet')
    player_shadow_rogue.equip('warlocks_figurine')
    # Assuming surprise attack is shadow damage for this test
    simulate_combat(player_shadow_rogue, 'ghoul', 'rogue_subtlety_surprise_attack')

    print("\n--- Holy Cleric Simulations ---")
    player_holy_cleric = Character(level=25, class_id='cleric')
    player_holy_cleric.equip('hammer_of_divine_light')
    player_holy_cleric.equip('rep_faithsworn_diadem')
    simulate_combat(player_holy_cleric, 'ghoul', 'cleric_shadow_smite')
