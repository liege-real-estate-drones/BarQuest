import json
import math

def get_elemental_type(monster):
    name = monster['nom'].lower()
    family = monster['famille'].lower()

    # Theme-based name checks
    if any(keyword in name for keyword in ['fire', 'cinder', 'magma', 'inferno', 'flame', 'ash', 'balrog', 'efreeti', 'phoenix', 'pyro', 'scorching', 'blazing', 'ember']):
        return 'fire'
    if any(keyword in name for keyword in ['ice', 'frost', 'glacial', 'rime', 'boreal', 'frozen', 'icy']):
        return 'ice'
    if any(keyword in name for keyword in ['shadow', 'void', 'nether', 'dread', 'spectral', 'wraith', 'cursed', 'crypt', 'soul']):
        return 'shadow'
    if any(keyword in name for keyword in ['nature', 'sylvan', 'grove', 'verdant', 'plant', 'thorn', 'dryad', 'ancient', 'razorvine']):
        return 'nature'

    # Family-based checks
    if family == 'elemental':
        return 'nature'
    if family == 'demon':
        return 'fire'
    if family == 'undead':
        return 'shadow'
    if family == 'aberration':
        return 'shadow'
    if family == 'plant' or family == 'fey':
        return 'nature'
    if family == 'dragonkin':
        return 'fire'
    if family == 'construct':
        return 'nature'
    if family == 'beast':
        return 'nature'
    if family == 'giant':
        return 'nature'

    return 'nature'

with open('public/data/monsters.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for monster in data['monsters']:
    # If elementalDamage is missing or empty, add it.
    if not monster.get('elementalDamage'):
        monster['elementalDamage'] = {}
        monster['elementalDamage']['type'] = get_elemental_type(monster)

        if monster['isBoss']:
            min_dmg = math.ceil(monster['stats']['AttMin'] * 0.35)
            max_dmg = math.ceil(monster['stats']['AttMax'] * 0.35)
            monster['elementalDamage']['min'] = min_dmg
            monster['elementalDamage']['max'] = max_dmg
        else:
            min_dmg = math.ceil(monster['level'] / 10) + 1
            max_dmg = math.ceil(monster['level'] / 5) + 2
            monster['elementalDamage']['min'] = min_dmg
            monster['elementalDamage']['max'] = max_dmg

    # If it's a boss and already has elemental damage, ensure it's at least 35% of their physical attack.
    elif monster['isBoss']:
        current_min = monster['elementalDamage'].get('min', 0)
        current_max = monster['elementalDamage'].get('max', 0)

        phys_min = monster['stats']['AttMin']
        phys_max = monster['stats']['AttMax']

        required_min = math.ceil(phys_min * 0.35)
        required_max = math.ceil(phys_max * 0.35)

        if current_min < required_min:
            monster['elementalDamage']['min'] = required_min
        if current_max < required_max:
            monster['elementalDamage']['max'] = required_max

with open('public/data/monsters.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("monsters.json has been updated with elemental damage for all monsters.")
