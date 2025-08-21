// src/data/schemas.ts

import { z } from "zod";
import { CombatLogEntry } from "@/lib/types";

export const RaretéEnum = z.enum(["Commun", "Magique", "Rare", "Épique", "Légendaire", "Unique"]);

export const ThemeSchema = z.enum(["fire", "ice", "nature", "shadow"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const StatsSchema = z.object({
  PV: z.number().int(),
  RessourceMax: z.number().int().optional(),
  Force: z.number().int().optional(),
  Intelligence: z.number().int().optional(),
  Dexterite: z.number().int().optional(),
  Esprit: z.number().int().optional(),
  AttMin: z.number().int(),
  AttMax: z.number().int(),
  CritPct: z.number(),
  CritDmg: z.number(),
  Armure: z.number().int(),
  ResElems: z.record(z.string(), z.number()).optional(),
  Vitesse: z.number(),
  Precision: z.number(),
  Esquive: z.number(),
  HealingReceivedMultiplier: z.number().optional(),
  DamageMultiplier: z.number().optional(),
  DamageReductionMultiplier: z.number().optional(),
  HPRegenPercent: z.number().optional(),
    ShadowDamageMultiplier: z.number().optional(),
});

export const AffixSchema = z.object({
  id: z.string(),
  ref: z.string(), // e.g., "Force", "CritPct"
  type: z.enum(["prefix","suffix"]),
  portée: z.tuple([z.number(), z.number()]),
  échelonnage: z.enum(["lin", "exp", "palier"]),
  tags: z.array(z.string()).optional(),
  isEnchantment: z.boolean().optional(),
});

export const ItemSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  bonuses: z.record(z.number(), z.string())
});

export const MaterialTypeSchema = z.enum(["metal", "leather", "cloth", "wood", "gem", "magic", "misc"]);
export type MaterialType = z.infer<typeof MaterialTypeSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: z.enum(["m", "f"]).optional(),
  material_type: MaterialTypeSchema.optional(),
  slot: z.enum([
    "weapon","head","chest","legs","hands","feet",
    "belt","amulet","ring","ring2","trinket","offhand", "potion"
  ]).optional(),
  type: z.string().optional(),
  niveauMin: z.number().int(),
  rarity: RaretéEnum,
  stats: StatsSchema.optional(),
  affixes: z.array(z.object({ ref: z.string(), val: z.number(), isEnchantment: z.boolean().optional() })).optional(),
  tags: z.array(z.string()).optional(),
  tagsClasse: z.array(z.string()).default([]),
  effect: z.string().optional(),
  set: z.object({ id: z.string(), name: z.string() }).optional(),
  vendorPrice: z.number().optional(),
  sockets: z.number().optional(),
  enchantment: AffixSchema.optional(),
  isCrafted: z.boolean().optional(),
  isPlural: z.boolean().optional(),
  specialEffect: z.object({
    trigger: z.string(),
    effect: z.string(),
    skillId: z.string().optional(),
    details: z.record(z.any()).optional(),
  }).optional(),
});

export type Item = z.infer<typeof ItemSchema>;

export const ClasseSchema = z.object({
  id: z.string(),
  nom: z.string(),
  ressource: z.enum(["Mana", "Énergie", "Rage"]),
  archétype: z.string(),
  statsBase: StatsSchema,
});

const ConditionSchema = z.object({
    targetHpLessThan: z.number().optional(),
    targetHpGreaterThan: z.number().optional(),
});

const DamageEffectSchema = z.object({
    type: z.literal('damage'),
    damageType: z.enum(['physical', 'fire', 'ice', 'arcane', 'holy', 'shadow', 'nature']),
    source: z.enum(['weapon', 'spell']),
    target: z.enum(['primary', 'all_enemies']).optional(),
    multiplier: z.number().optional(),
    baseValue: z.number().optional(),
    conditions: ConditionSchema.optional(),
});

const StatModSchema = z.object({
    stat: z.string(),
    value: z.union([z.number(), z.array(z.number())]),
    modifier: z.enum(['additive', 'multiplicative']),
});

const BuffEffectSchema = z.object({
    type: z.literal('buff'),
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    buffType: z.enum(['hot', 'stat_modifier', 'special']),
    totalHealing: z.object({
        source: z.enum(['spell_power', 'attack_power', 'base_value']),
        multiplier: z.number()
    }).optional(),
    statMods: z.array(StatModSchema).optional(),
    value: z.any().optional(),
});

const ShieldEffectSchema = z.object({
    type: z.literal('shield'),
    amount: z.object({
        source: z.enum(['spell_power', 'base_value']),
        multiplier: z.number(),
    }),
    duration: z.number().optional(),
});

const DebuffEffectSchema = z.object({
    type: z.literal('debuff'),
    debuffType: z.enum(['dot', 'cc', 'stat_modifier']),
    target: z.enum(['primary', 'all_enemies']).optional(),
    conditions: ConditionSchema.optional(),
    id: z.string(),
    name: z.string(),
    duration: z.number(),
    damageType: z.enum(['physical', 'fire', 'ice', 'arcane', 'holy', 'shadow', 'nature']).optional(),
    totalDamage: z.object({
        source: z.enum(['weapon', 'spell_power', 'attack_power', 'base_value']),
        multiplier: z.number()
    }).optional(),
    ccType: z.enum(['stun', 'freeze']).optional(),
    statMods: z.array(StatModSchema).optional(),
});

const ResourceCostSchema = z.object({
    type: z.literal('resource_cost'),
    amount: z.number(),
});

const InvulnerabilityEffectSchema = z.object({
    type: z.literal('invulnerability'),
    duration: z.number(),
});

const DeathWardEffectSchema = z.object({
    type: z.literal('death_ward'),
    duration: z.number(),
    heal_percent: z.number(),
});

const TransformationEffectSchema = z.object({
    type: z.literal('transformation'),
    form: z.string(),
});

const SkillEffectSchema = z.union([
    DamageEffectSchema,
    BuffEffectSchema,
    DebuffEffectSchema,
    ResourceCostSchema,
    ShieldEffectSchema,
    InvulnerabilityEffectSchema,
    DeathWardEffectSchema,
    TransformationEffectSchema
]);

const BaseSkillTalentSchema = z.object({
  id: z.string(),
  nom: z.string(),
  classeId: z.string(),
  type: z.enum(["actif", "passif"]),
  niveauRequis: z.number().int().optional(),
  rangMax: z.number().int(),
  effets: z.array(z.string()),
  effects: z.array(SkillEffectSchema).optional(),
  exigences: z.array(z.string()).default([]),
});

export const SkillSchema = BaseSkillTalentSchema.extend({
  type: z.literal("actif"),
  school: z.enum(['holy', 'shadow', 'fire', 'ice', 'arcane', 'physical']).optional(),
  cooldown: z.number().default(0), // in seconds
});

const TalentEffectTriggerSchema = z.enum(['on_dodge']); // Start with on_dodge

const TalentEffectSchema = z.object({
    trigger: TalentEffectTriggerSchema,
    chance: z.number().optional().default(1),
    effects: z.array(SkillEffectSchema), // A talent can apply any of the existing skill effects
    cooldown: z.number().optional(),
});

export const TalentSchema = BaseSkillTalentSchema.extend({
  type: z.literal("passif"),
  triggeredEffects: z.array(TalentEffectSchema).optional(),
});


export const MonsterSchema = z.object({
  id: z.string(),
  nom: z.string(),
  level: z.number().int(),
  famille: z.string(),
  isBoss: z.boolean().default(false),
  palier: z.number().int(),
  stats: StatsSchema,
  elementalDamage: z.object({
    type: ThemeSchema,
    min: z.number(),
    max: z.number()
  }).optional(),
  lootTableId: z.string().optional(),
  questItemId: z.string().optional(),
  specificLootTable: z.array(z.string()).optional(),
  componentLoot: z.array(z.object({
    id: z.string(),
    chance: z.number(),
    quantity: z.number(),
  })).optional(),
});

export const DungeonSchema = z.object({
  id: z.string(),
  palier: z.number().int(),
  name: z.string(),
  biome: z.enum(["ice","fire","nature","shadow"]),
  damagePenetration: z.object({
      type: ThemeSchema,
      value: z.number() // Par exemple, 25 pour 25% de pénétration
  }).optional(),
  monsters: z.array(z.string()),
  modifiers: z.array(z.string()).default([]),
  killTarget: z.number().int().default(25),
  bossId: z.string(),
  factionId: z.string().optional(),
});

export const QueteSchema = z.object({
  id: z.string(),
  type: z.enum(["chasse", "nettoyage", "chasse_boss", "collecte", "defi"]),
  name: z.string(),
  desc: z.string(),
  requirements: z.object({
    dungeonId: z.string().optional(),
    killCount: z.number().int().optional(),
    clearCount: z.number().int().optional(),
    bossId: z.string().optional(),
    itemId: z.string().optional(),
    itemCount: z.number().int().optional(),
    timeLimit: z.number().int().optional(), // en secondes
    skillId: z.string().optional(),
    monsterType: z.string().optional(),
    classId: z.string().optional()
  }),
  rewards: z.object({
    gold: z.number().int(),
    xp: z.number().int(),
    reputation: z.object({
        factionId: z.string(),
        amount: z.number().int(),
    }).optional(),
  }),
});


export const FactionRankSchema = z.object({
  name: z.string(),
  threshold: z.number().int(),
  rewardItemId: z.string().optional(),
});

export const FactionSchema = z.object({
    id: z.string(),
    name: z.string(),
    ranks: z.array(FactionRankSchema),
});

export const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  result: z.string(),
  materials: z.record(z.string(), z.number()),
  cost: z.number().int(),
});

export const EnchantmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    affixRef: z.string(),
    cost: z.array(z.object({ id: z.string(), amount: z.number() })),
    tier: z.number().optional(),
    level: z.number().optional(),
    source: z.array(z.string()).optional(),
    reputationRequirement: z.object({
        factionId: z.string(),
        threshold: z.number(),
    }).optional(),
});

export interface DungeonCompletionSummary {
    killCount: number;
    goldGained: number;
    xpGained: number;
    itemsGained: Item[];
    recipesGained?: any[]; // Using any to avoid circular dependency issues with Enchantment type
    chestRewards?: {
        gold: number;
        items: Item[];
    };
    combatLog: CombatLogEntry[];
}

export const NameAffixSchema = z.object({
    ms: z.string(),
    fs: z.string(),
    mp: z.string(),
    fp: z.string(),
    tags: z.array(z.string()),
});

export const NameQualifierSchema = z.object({
    text: z.string(),
    tags: z.array(z.string()),
});

export const MaterialNameSchema = z.object({
    text: z.string(),
    tags: z.array(z.string()),
});

export const NameAffixesSchema = z.object({
    prefixes: z.array(NameAffixSchema),
    suffixes_adjectives: z.array(NameAffixSchema),
    suffixes_qualifiers: z.array(NameQualifierSchema),
    materials: z.array(MaterialNameSchema),
});