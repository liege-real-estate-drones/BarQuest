import { z } from 'zod';
import type {
  StatsSchema,
  AffixSchema,
  ItemSchema,
  TalentSchema,
  MonsterSchema,
  DungeonSchema,
  RaretéEnum,
} from '@/data/schemas';

export type Rareté = z.infer<typeof RaretéEnum>;
export type Stats = z.infer<typeof StatsSchema>;
export type Affixe = z.infer<typeof AffixSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Talent = z.infer<typeof TalentSchema>;
export type Monstre = z.infer<typeof MonsterSchema>;
export type Dungeon = z.infer<typeof DungeonSchema>;

export type PlayerClass = 'berserker' | 'mage' | 'druid';

export interface PlayerState {
  name: string;
  classe: PlayerClass;
  level: number;
  xp: number;
  stats: Stats;
  talentPoints: number;
  resources: {
    mana: number;
  };
}

export interface InventoryState {
  gold: number;
  items: Item[];
  equipment: Record<Item['slot'], Item | null>;
}

export interface CombatLogEntry {
    message: string;
    type: 'player_attack' | 'enemy_attack' | 'crit' | 'loot' | 'info' | 'flee' | 'levelup';
    timestamp: number;
}

export interface CombatState {
  enemy: (Monstre & { initialHp?: number }) | null;
  playerAttackInterval: number; // in ms
  playerAttackProgress: number; // 0 to 1
  enemyAttackInterval: number; // in ms
  enemyAttackProgress: number; // 0 to 1
  killCount: number;
  log: CombatLogEntry[];
  autoAttack: boolean;
}

export interface GameData {
  dungeons: Dungeon[];
  monsters: Monstre[];
  items: Item[];
  talents: Talent[];
  affixes: Affixe[];
}