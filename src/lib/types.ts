import { z } from 'zod';
import type {
  AffixSchema,
  ItemSchema,
  TalentSchema,
  MonsterSchema,
  DungeonSchema,
  StatsSchema,
} from '@/data/schemas';

export type Stats = z.infer<typeof StatsSchema>;
export type Affix = z.infer<typeof AffixSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Talent = z.infer<typeof TalentSchema>;
export type Monster = z.infer<typeof MonsterSchema>;
export type Dungeon = z.infer<typeof DungeonSchema>;
