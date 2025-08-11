import { z } from "zod";

export const RaretéEnum = z.enum(["Commun", "Rare", "Épique", "Légendaire"]);

export const StatsSchema = z.object({
  str: z.number().int().nonnegative().default(0),
  int: z.number().int().nonnegative().default(0),
  dex: z.number().int().nonnegative().default(0),
  spi: z.number().int().nonnegative().default(0),
  armor: z.number().int().nonnegative().default(0),
  hp: z.number().int().optional(),
  pa: z.number().int().optional(),
  res: z.object({
    fire: z.number().int().default(0),
    frost: z.number().int().default(0),
    nature: z.number().int().default(0),
    occult: z.number().int().default(0),
  }).default({ fire: 0, frost: 0, nature: 0, occult: 0 }),
});

export const AffixSchema = z.object({
  id: z.string(),
  type: z.enum(["prefix","suffix"]),
  tags: z.array(z.string()).default([]),
  stat: z.string(),
  min: z.number(),
  max: z.number(),
  weight: z.number().default(1),
});

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slot: z.enum([
    "weapon","head","chest","legs","hands","feet",
    "belt","amulet","ring","ring2","trinket","offhand"
  ]),
  ilevel: z.number().int(),
  rarity: z.enum(["common", "uncommon", "rare","epic"]),
  tags: z.array(z.string()).default([]),
  base: z.object({ min: z.number(), max: z.number(), speed: z.number().positive().default(2.0) }).partial(),
  affixes: z.array(z.union([z.string(), AffixSchema])).default([]),
});

export const TalentSchema = z.object({
  id: z.string(),
  name: z.string(),
  cls: z.enum(["berserker","mage","druid"]),
  tier: z.number().int().min(1).max(3),
  keystone: z.boolean().default(false),
  effects: z.array(z.object({ stat: z.string(), value: z.number() })),
});

export const MonsterSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int(),
  family: z.string(),
  isBoss: z.boolean().default(false),
  biome: z.array(z.enum(["frost","fire","nature","occult"])).default([]),
  stats: StatsSchema,
  affixes: z.array(z.string()).default([]),
  drops: z.object({ gold: z.tuple([z.number().int(), z.number().int()]), tables: z.array(z.string()).default([]) }),
});

export const DungeonSchema = z.object({
  id: z.string(),
  index: z.number().int(),
  name: z.string(),
  biome: z.enum(["frost","fire","nature","occult"]),
  recommendedLevel: z.number().int(),
  modifiers: z.array(z.string()).default([]),
  killTarget: z.number().int().default(25),
  bossId: z.string(),
});
