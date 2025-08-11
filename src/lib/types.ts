import { z } from 'zod';
import type {
  StatsSchema,
  AffixeSchema,
  ItemSchema,
  TalentSchema,
  MonsterSchema,
  DungeonSchema,
  RaretéEnum,
} from '@/data/schemas';

export type Rareté = z.infer<typeof RaretéEnum>;
export type Stats = z.infer<typeof StatsSchema>;
export type Affixe = z.infer<typeof AffixeSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Talent = z.infer<typeof TalentSchema>;
export type Monster = z.infer<typeof MonsterSchema>;
export type Dungeon = z.infer<typeof DungeonSchema>;
