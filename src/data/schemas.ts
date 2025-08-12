import { z } from "zod";

export const RaretéEnum = z.enum(["Commun", "Rare", "Épique", "Légendaire", "Unique"]);

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
});

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slot: z.enum([
    "weapon","head","chest","legs","hands","feet",
    "belt","amulet","ring","ring2","trinket","offhand"
  ]),
  niveauMin: z.number().int(),
  rarity: RaretéEnum,
  affixes: z.array(z.object({ ref: z.string(), val: z.number() })).default([]),
  tagsClasse: z.array(z.string()).default([]),
  effect: z.string().optional(),
});

export const ClasseSchema = z.object({
  id: z.string(),
  nom: z.string(),
  ressource: z.enum(["Mana", "Énergie", "Rage"]),
  archétype: z.string(),
  statsBase: StatsSchema,
});


export const TalentSchema = z.object({
  id: z.string(),
  nom: z.string(),
  classeId: z.string(),
  rangMax: z.number().int(),
  effets: z.array(z.string()),
  exigences: z.array(z.string()),
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
});

export const QueteSchema = z.object({
  id: z.string(),
  type: z.enum(["chasse"]),
  name: z.string(),
  desc: z.string(),
  requirements: z.object({
    dungeonId: z.string(),
    killCount: z.number().int(),
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

export const FactionSchema = z.object({
    id: z.string(),
    name: z.string(),
    ranks: z.array(z.string()),
});
