
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
} from '@/data/schemas';

export type Rareté = z.infer<typeof RaretéEnum>;
export type Quete = z.infer<typeof QueteSchema>;
export type Faction = z.infer<typeof FactionSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type Affixe = z.infer<typeof AffixSchema>;
export type Item = z.infer<typeof ItemSchema> & { vendorPrice?: number };
export type Talent = z.infer<typeof TalentSchema>;
export type Monstre = z.infer<typeof MonsterSchema>;
export type Dungeon = z.infer<typeof DungeonSchema>;
export type Classe = z.infer<typeof ClasseSchema>;

export type PlayerClassId = 'berserker' | 'mage' | 'rogue' | 'cleric';

export type ResourceType = 'Mana' | 'Rage' | 'Énergie';

export interface PlayerState {
  name: string;
  classeId: PlayerClassId | null;
  level: number;
  xp: number;
  baseStats: Stats; // Unmodified stats from class + level
  stats: Stats; // Current stats with equipment
  talentPoints: number;
  talents: { [talentId: string]: number }; // e.g. { 'wr1': 2, 'wr5': 1 }
  resources: {
    current: number;
    max: number;
    type: ResourceType;
  };
  reputation: {
    [factionId: string]: number;
  };
  activeEffects: string[];
}

export interface InventoryState {
  gold: number;
  items: Item[];
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

export interface CombatLogEntry {
    message: string;
    type: 'player_attack' | 'enemy_attack' | 'crit' | 'loot' | 'info' | 'flee' | 'levelup';
    timestamp: number;
    item?: Item;
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
  classes: Classe[];
  quests: Quete[];
  factions: Faction[];
}

    