// src/lib/types.ts

import { z } from 'zod';
import type {
  StatsSchema,
  AffixSchema,
  ItemSchema,
  TalentSchema,
  MonsterSchema,
  DungeonSchema,
  RaretéEnum,
  ClasseSchema,
  QueteSchema,
  FactionSchema,
  SkillSchema,
  ItemSetSchema,
  RecipeSchema,
  MaterialTypeSchema,
  ThemeSchema,
  EnchantmentSchema,
} from '@/data/schemas';

export type Rareté = z.infer<typeof RaretéEnum>;
export type Quete = z.infer<typeof QueteSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Affixe = z.infer<typeof AffixSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Talent = z.infer<typeof TalentSchema>;
export type MaterialType = z.infer<typeof MaterialTypeSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Monstre = z.infer<typeof MonsterSchema> & { id: string };
export type Dungeon = z.infer<typeof DungeonSchema>;
export type Classe = z.infer<typeof ClasseSchema>;
export type ItemSet = z.infer<typeof ItemSetSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type Enchantment = z.infer<typeof EnchantmentSchema>;

export interface EnchantingComponent {
  id: string;
  name: string;
  tier: number | string;
}

export type PlayerClassId = 'berserker' | 'mage' | 'rogue' | 'cleric';

export type ResourceType = 'Mana' | 'Rage' | 'Énergie';
export type PotionType = 'health' | 'resource';

export interface GameData {
  dungeons: Dungeon[];
  monsters: Monstre[];
  items: Item[];
  talents: Talent[];
  skills: Skill[];
  affixes: Affixe[];
  classes: Classe[];
  quests: Quete[];
  factions: Faction[];
  sets: ItemSet[];
  recipes: Recipe[];
  enchantments: Enchantment[];
  components: EnchantingComponent[];
}

export type StatMod = {
    stat: keyof Stats;
    value: number;
    modifier: 'additive' | 'multiplicative';
};

export interface Buff {
    id: string;
    name: string;
    duration: number;
    value?: any;
    stacks?: number;
    is_stacking?: boolean;
    max_stacks?: number;
    healingPerTick?: number;
    tickInterval?: number;
    nextTickIn?: number;
    statMods?: StatMod[];
    isDeathWard?: boolean;
    deathWardHealPercent?: number;
}

export interface Debuff {
    id:string;
    name: string;
    duration: number;
    isDebuff?: boolean;
    stacks?: number;
    is_stacking?: boolean;
    max_stacks?: number;
    damagePerTick?: number;
    tickInterval?: number;
    nextTickIn?: number;
    num_ticks?: number;
    statMods?: StatMod[];
    damageType?: Theme;
}

export interface PlayerState {
  id: string;
  name: string;
  classeId: PlayerClassId | null;
  level: number;
  xp: number;
  baseStats: Stats; // Unmodified stats from class + level
  stats: Stats; // Current stats with equipment
  talentPoints: number;
  learnedSkills: { [skillId: string]: number }; // e.g. { 'berserker_heroic_strike': 1 }
  learnedTalents: { [talentId: string]: number }; // e.g. { 'berserker_toughness': 2 }
  learnedRecipes: string[]; // IDs of learned enchanting recipes
  equippedSkills: (string | null)[]; // Array of 4 slots for equipped skills
  resources: {
    current: number;
    max: number;
    type: ResourceType;
  };
  reputation: {
    [factionId:string]: {
        value: number,
        claimedRewards: string[],
    };
  };
  activeEffects: string[];
  activeBuffs: Buff[];
  activeDebuffs: Debuff[];
  activeSetBonuses: string[];
  completedDungeons: Record<string, number>; // { [dungeonId]: count }
  completedQuests: string[];
  shield: number;
  invulnerabilityDuration: number;
  stunDuration: number;
  form: string | null;
  isImmuneToCC: boolean;
  nextAttackIsGuaranteedCrit: boolean;
}

export interface InventoryState {
  gold: number;
  items: Item[];
  craftingMaterials: { [materialId: string]: number };
  potions: {
    health: number;
    resource: number;
  };
  equipment: {
    weapon: Item | null;
    head: Item | null;
    chest: Item | null;
    legs: Item | null;
    hands: Item | null;
    feet: Item | null;
    belt: Item | null;
    amulet: Item | null;
    ring: Item | null;
    ring2: Item | null;
    trinket: Item | null;
    offhand: Item | null;
  };
}

export type CombatEnemy = Monstre & {
    initialHp: number;
    attackProgress: number;
    templateId: string;
    originalId: string;
    activeDebuffs: Debuff[];
    activeBuffs: Buff[];
    stunDuration: number;
    elementalDamage?: {
        type: Theme;
        min: number;
        max: number;
    };
    abilities?: any[];
    image?: string;
};

export interface CombatLogEntry {
    message: string;
    type: 'player_attack' | 'enemy_attack' | 'crit' | 'loot' | 'info' | 'flee' | 'levelup' | 'heal' | 'quest' | 'shield' | 'poison_proc' | 'talent_proc';
    timestamp: number;
    item?: Item;
}

export type FloatingTextType = 'damage' | 'crit' | 'heal' | 'dodge' | 'miss' | 'buff' | 'debuff' | 'info' | 'shield';

export interface FloatingText {
  id: string;
  text: string;
  type: FloatingTextType;
  entityId: string;
}

export interface CombatState {
  enemies: CombatEnemy[];
  playerAttackInterval: number; // in ms
  playerAttackProgress: number; // 0 to 1
  skillCooldowns: { [skillId: string]: number }; // { skillId: remainingTimeInMs }
  monsterSkillCooldowns: { [monsterSkillId: string]: number };
  killCount: number;
  log: CombatLogEntry[];
  autoAttack: boolean;
  dungeonRunItems: Item[];
  targetIndex: number;
  isStealthed: boolean;
  pendingActions: any[];
  goldGained: number;
  xpGained: number;
  ultimateTalentUsed: boolean;
  floatingTexts: FloatingText[];
}

export interface ItemGenerationContext {
  rarity: Rareté;
  tags: string[];
}