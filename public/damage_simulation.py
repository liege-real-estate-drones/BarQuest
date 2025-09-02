# This script is for simulating combat scenarios to help with game balancing.
# ... (les commentaires initiaux restent les mêmes) ...

import json
import random
import pprint
import os

# ==============================================================================
# === PARAMÈTRE DE TEST : CHOIX DE LA FORMULE DE DÉGÂTS ===
# True = Nouvelle formule (Pourcentage pour attaques ET sorts)
# False = Ancienne formule (Dégâts plats)
# ==============================================================================
USE_PERCENTAGE_BASED_FORMULA = True
# ==============================================================================

# Get the directory of the script
script_dir = os.path.dirname(__file__)

# --- CORRECTION DE LA GESTION DES CHEMINS D'ACCÈS ---
def get_data_path(filename):
    """Construit le chemin d'accès correct vers les fichiers de données."""
    return os.path.join(script_dir, 'data', filename)

# Load data from JSON files
try:
    with open(get_data_path('items.json'), 'r', encoding='utf-8') as f:
        items_data = json.load(f)
    with open(get_data_path('monsters.json'), 'r', encoding='utf-8') as f:
        monsters_data = json.load(f)
    with open(get_data_path('skills.json'), 'r', encoding='utf-8') as f:
        skills_data = json.load(f)
    with open(get_data_path('classes.json'), 'r', encoding='utf-8') as f:
        classes_data = json.load(f)
except FileNotFoundError as e:
    print(f"--- ERREUR CRITIQUE: Fichier de données non trouvé. Vérifiez la structure de vos dossiers. ---")
    print(f"Le script s'attend à trouver un dossier 'data' dans le même répertoire que lui.")
    print(f"Détail de l'erreur: {e}")
    exit()


# --- Fonctions de calcul ---

def calculate_spell_power(stats, class_id):
    if class_id == 'cleric':
        return 1.5 * stats.get('Esprit', 0)
    return 2 * stats.get('Intelligence', 0)

def calculate_elemental_damage(elemental_damage, resistance):
    resistance_value = max(0, min(100, resistance))
    return round(elemental_damage * (1 - resistance_value / 100))

def calculate_player_attack_damage(stats):
    return random.uniform(stats.get('AttMin', 0), stats.get('AttMax', 0))

def get_rank_value(values, rank):
    if values is None: return 0
    if isinstance(values, (int, float)): return values
    return values[min(rank - 1, len(values) - 1)] or 0

def calculate_armor_dr(armor, enemy_level):
    denominator = armor + (100 + 20 * enemy_level)
    if denominator == 0: return 0
    dr = armor / denominator
    return min(dr, 0.75)

# --- Classes du jeu ---
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
                return class_info['statsBase'].copy()
        return {}
    
    def get_skills(self):
        skills = []
        for skill in skills_data['skills']:
            if skill.get('classeId') == self.class_id and skill.get('niveauRequis', 1) <= self.level:
                skills.append(skill)
        return skills

    def equip_set(self, item_ids):
        for item_id in item_ids:
            if item_id is None or item_id.strip() == "": continue
            found = False
            for item in items_data['items']:
                if item['id'] == item_id:
                    self.equipment[item['slot']] = item
                    found = True
                    break
            if not found:
                 print(f"--- AVERTISSEMENT: Objet '{item_id}' non trouvé dans items.json ---")
        self.update_stats()

    def update_stats(self):
        self.stats = self.get_base_stats()
        for item in self.equipment.values():
            stats_sources = [item.get('affixes', []), item.get('stats', {})]
            for source in stats_sources:
                if isinstance(source, list):
                    for affix in source:
                        keys = affix['ref'].split('.')
                        current_level = self.stats
                        for i, key in enumerate(keys):
                            if i == len(keys) - 1:
                                current_level[key] = current_level.get(key, 0) + affix['val']
                            else:
                                if key not in current_level: current_level[key] = {}
                                current_level = current_level[key]
                elif isinstance(source, dict):
                    for key, value in source.items():
                        if isinstance(value, dict):
                            if key not in self.stats: self.stats[key] = {}
                            for sub_key, sub_value in value.items():
                                self.stats[key][sub_key] = self.stats[key].get(sub_key, 0) + sub_value
                        else:
                            self.stats[key] = self.stats.get(key, 0) + value

class Monster:
    def __init__(self, monster_id):
        self.id = None
        for monster in monsters_data['monsters']:
            if monster['id'] == monster_id:
                self.id = monster['id']
                self.name = monster['nom']
                self.level = monster['level']
                self.stats = monster['stats']
                return

# --- Moteur de Simulation ---

def simulate_combat(player, monster_id, skill_id, turns=100, debuff_stacks=0):
    monster = Monster(monster_id)
    if not monster.id:
        print(f"--- ERREUR: Monstre '{monster_id}' non trouvé dans monsters.json ---")
        return 0
    total_damage = 0
    
    skill_to_use = next((s for s in player.skills if s['id'] == skill_id), None)
            
    if not skill_to_use:
        print(f"--- ERREUR: Compétence '{skill_id}' non trouvée pour la classe {player.class_id} ---")
        return 0
        
    skill_rank = skill_to_use.get('rangMax', 1)
    
    formula_name = "Pourcentage" if USE_PERCENTAGE_BASED_FORMULA else "Dégâts Plats"
    print(f"\n--- Simulation ({formula_name}): {player.class_id} niv {player.level} vs {monster.name} avec {skill_id} ---")

    for _ in range(turns):
        turn_damage = 0
        
        for effect in skill_to_use.get('effects', []):
            if effect.get('type') == 'damage':
                damage_effect = effect
                base_damage_for_scaling = 0
                
                # --- Étape 1: Calculer les dégâts de base de la compétence ---
                if damage_effect['source'] == 'weapon':
                    attack_damage = calculate_player_attack_damage(player.stats)
                    multiplier = get_rank_value(damage_effect.get('multiplier', 1), skill_rank)
                    bonus_flat_damage = get_rank_value(damage_effect.get('bonus_flat_damage', 0), skill_rank)
                    
                    physical_damage_base = attack_damage * multiplier + bonus_flat_damage
                    armor_dr = calculate_armor_dr(monster.stats.get('Armure', 0), player.level)
                    mitigated_physical_damage = physical_damage_base * (1 - armor_dr)
                    
                    turn_damage += mitigated_physical_damage
                    base_damage_for_scaling = mitigated_physical_damage

                elif damage_effect['source'] == 'spell':
                    spell_power = calculate_spell_power(player.stats, player.class_id)
                    base_damage_from_skill = get_rank_value(damage_effect['baseValue'], skill_rank)
                    damage_type = damage_effect['damageType']
                    
                    base_spell_damage = base_damage_from_skill * (1 + spell_power / 100)
                    resistance = monster.stats.get('ResElems', {}).get(damage_type, 0)
                    mitigated_spell_damage = calculate_elemental_damage(base_spell_damage, resistance)

                    turn_damage += mitigated_spell_damage
                    base_damage_for_scaling = mitigated_spell_damage

                # --- Étape 2: Ajouter les bonus de l'équipement, basés sur les dégâts de base ---
                elemental_bonuses = {**player.stats.get('DmgElems', {}), **player.stats.get('BonusDmg', {})}
                for dmg_type, dmg_value in elemental_bonuses.items():
                    elemental_damage_to_add = 0
                    if USE_PERCENTAGE_BASED_FORMULA:
                        elemental_damage_to_add = base_damage_for_scaling * (dmg_value / 100.0)
                    else:
                        elemental_damage_to_add = dmg_value
                    
                    resistance = monster.stats.get('ResElems', {}).get(dmg_type, 0)
                    mitigated_elemental_damage = calculate_elemental_damage(elemental_damage_to_add, resistance)
                    turn_damage += mitigated_elemental_damage

            elif effect.get('type') == 'consume_debuff_for_damage':
                damage_per_stack = effect['damage_per_stack']
                damage_type = effect['damageType']
                consumed_damage = damage_per_stack * debuff_stacks
                resistance = monster.stats.get('ResElems', {}).get(damage_type, 0)
                mitigated_consumed_damage = calculate_elemental_damage(consumed_damage, resistance)
                turn_damage += mitigated_consumed_damage

        total_damage += turn_damage

    average_dps = total_damage / turns
    print(f"-> DPS moyen sur {turns} tours: {average_dps:.2f}")
    return average_dps

# --- Bloc d'Exécution ---
if __name__ == '__main__':
    # --- LISTES D'ÉQUIPEMENT VÉRIFIÉES ET CORRIGÉES ---
    mage_gear = [
        'staff_of_the_comet_caller', 'rep_magma_callers_cowl', 'set_mage_t2_shoulders', 'robes_of_the_void',
        'set_mage_t2_gloves', 'sash_of_the_adept', 'set_mage_t2_legs', 'set_mage_t2_boots',
        'amulet_fire_ruby', 'sapphire_ring'
    ]
    berserker_gear = [
        'axe_of_the_deathbringer', 'set_berserker_t2_helm', 'set_berserker_t2_shoulders', 'dragonscale_cuirass',
        'set_berserker_t2_gloves', 'set_berserker_t2_belt', 'set_berserker_t2_legs', 'set_berserker_t2_boots',
        'mark_of_the_soldier', 'iron_ring_of_power'
    ]
    rogue_gear = [
        'kingslayers_fangs', 'set_shadow_shroud_mask', 'set_rogue_t2_shoulders', 'wraithstalker_jerkin',
        'set_rogue_t2_gloves', 'set_rogue_t2_belt', 'set_rogue_t2_leggings', 'set_rogue_t2_boots',
        'shadow_gem_amulet', 'main_gauche'
    ]
    cleric_gear = [
        'hammer_of_divine_light', 'rep_faithsworn_diadem', 'set_cleric_t2_shoulders', 'vestments_of_the_redeemer',
        'set_cleric_t2_gloves', 'set_cleric_t2_belt', 'set_cleric_t2_legs', 'set_cleric_t2_boots',
        'silver_amulet', 'wooden_shield' # 'ring_of_divine_favor' n'existe pas
    ]
    
    print("--- SIMULATIONS AVEC ÉQUIPEMENT COMPLET (Niveau 25) ---")
    
    player_berserker = Character(level=25, class_id='berserker')
    player_berserker.equip_set(berserker_gear)
    simulate_combat(player_berserker, 'cinder_lord', 'berserker_heroic_strike')
    
    player_shadow_rogue = Character(level=25, class_id='rogue')
    player_shadow_rogue.equip_set(rogue_gear)
    simulate_combat(player_shadow_rogue, 'ghoul', 'rogue_subtlety_surprise_attack')
    
    player_fire_mage = Character(level=25, class_id='mage')
    player_fire_mage.equip_set(mage_gear)
    simulate_combat(player_fire_mage, 'cinder_lord', 'mage_fire_fireball')

    player_cleric = Character(level=25, class_id='cleric')
    player_cleric.equip_set(cleric_gear)
    simulate_combat(player_cleric, 'ghoul', 'cleric_shadow_smite')