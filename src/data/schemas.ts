// src/data/schemas.ts

import { z } from "zod";

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
});

export const AffixSchema = z.object({
  id: z.string(),
  ref: z.string(), // e.g., "Force", "CritPct"
  type: z.enum(["prefix","suffix"]),
  portée: z.tuple([z.number(), z.number()]),
  échelonnage: z.enum(["lin", "exp", "palier"]),
  theme: ThemeSchema.optional(),
});

export const ItemSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  bonuses: z.record(z.number(), z.string())
});

export const MaterialTypeSchema = z.enum(["metal", "leather", "cloth", "wood"]);
export type MaterialType = z.infer<typeof MaterialTypeSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  material_type: MaterialTypeSchema.optional(),
  slot: z.enum([
    "weapon","head","chest","legs","hands","feet",
    "belt","amulet","ring","ring2","trinket","offhand", "potion"
  ]).optional(),
  type: z.string().optional(),
  niveauMin: z.number().int(),
  rarity: RaretéEnum,
  stats: StatsSchema.optional(),
  affixes: z.array(z.object({ ref: z.string(), val: z.number() })).optional(),
  tagsClasse: z.array(z.string()).default([]),
  effect: z.string().optional(),
  set: z.object({ id: z.string(), name: z.string() }).optional(),
  vendorPrice: z.number().optional(),
  sockets: z.number().optional(),
  enchantment: AffixSchema.optional(),
  isCrafted: z.boolean().optional(),
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

const BaseSkillTalentSchema = z.object({
  id: z.string(),
  nom: z.string(),
  classeId: z.string(),
  type: z.enum(["actif", "passif"]),
  niveauRequis: z.number().int().optional(),
  rangMax: z.number().int(),
  effets: z.array(z.string()),
  exigences: z.array(z.string()).default([]),
});

export const SkillSchema = BaseSkillTalentSchema.extend({
  type: z.literal("actif"),
  cooldown: z.number().default(0), // in seconds
});

export const TalentSchema = BaseSkillTalentSchema.extend({
  type: z.literal("passif"),
});


export const MonsterSchema = z.object({
  id: z.string(),
  nom: z.string(),
  level: z.number().int(),
  famille: z.string(),
  isBoss: z.boolean().default(false),
  palier: z.number().int(),
  stats: StatsSchema,
  lootTableId: z.string().optional(),
  questItemId: z.string().optional(),
  specificLootTable: z.array(z.string()).optional(),
});

export const DungeonSchema = z.object({
  id: z.string(),
  palier: z.number().int(),
  name: z.string(),
  biome: z.enum(["frost","fire","nature","occult"]),
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

export interface DungeonCompletionSummary {
    killCount: number;
    goldGained: number;
    xpGained: number;
    itemsGained: Item[];
    chestRewards?: {
        gold: number;
        items: Item[];
    };
}