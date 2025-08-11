import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monster, Item, Talent, Affix, Stats } from '@/lib/types';
import * as formulas from '@/core/formulas';

export type PlayerClass = 'berserker' | 'mage' | 'druid';

export interface PlayerState {
  name: string;
  class: PlayerClass;
  level: number;
  xp: number;
  stats: Stats;
  talentPoints: number;
  resources: {
    hp: number;
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
  enemy: (Monster & { initialHp?: number }) | null;
  playerAttackInterval: number; // in ms
  playerAttackProgress: number; // 0 to 1
  enemyAttackInterval: number; // in ms
  enemyAttackProgress: number; // 0 to 1
  killCount: number;
  log: CombatLogEntry[];
  autoAttack: boolean;
}

interface GameData {
  dungeons: Dungeon[];
  monsters: Monster[];
  items: Item[];
  talents: Talent[];
  affixes: Affix[];
}

interface GameState {
  isInitialized: boolean;
  lastPlayed: number | null;
  view: 'TOWN' | 'COMBAT';
  currentDungeon: Dungeon | null;
  gameData: GameData;
  player: PlayerState;
  inventory: InventoryState;
  combat: CombatState;
  
  initializeGameData: (data: GameData) => void;
  enterDungeon: (dungeonId: string) => void;
  startCombat: () => void;
  gameTick: (delta: number) => void;
  playerAttack: () => void;
  enemyAttack: () => void;
  flee: () => void;
  toggleAutoAttack: () => void;
  getXpToNextLevel: () => number;
}

const initialPlayerState: PlayerState = {
  name: "Hero",
  class: 'berserker',
  level: 1,
  xp: 0,
  stats: { str: 10, int: 5, dex: 7, spi: 6, armor: 10, res: { fire: 0, frost: 0, nature: 0, occult: 0 } },
  talentPoints: 0,
  resources: { hp: 100, mana: 50 },
};

const initialInventoryState: InventoryState = {
  gold: 100,
  items: [],
  equipment: { weapon: null, head: null, chest: null, legs: null, hands: null, feet: null, belt: null, amulet: null, ring: null, ring2: null, trinket: null, offhand: null },
};

const initialCombatState: CombatState = {
  enemy: null,
  playerAttackInterval: 2000,
  playerAttackProgress: 0,
  enemyAttackInterval: 2500,
  enemyAttackProgress: 0,
  killCount: 0,
  log: [],
  autoAttack: false,
};

let gameLoop: any = null;

const resolveLoot = (monster: Monster, gameData: GameData): Item | null => {
  if (!monster.drops.tables || monster.drops.tables.length === 0) {
    return null;
  }

  // For now, let's keep it simple: 25% chance to drop any item from its tables
  if (Math.random() > 0.25) {
    return null;
  }
  
  const possibleItems = gameData.items.filter(item => 
      monster.drops.tables.some(tag => item.tags.includes(tag)) &&
      item.ilevel <= monster.level + 2 // Item level constraint
  );

  if (possibleItems.length === 0) {
    return null;
  }

  const droppedItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
  return JSON.parse(JSON.stringify(droppedItem));
};


export const useGameStore = create<GameState>()(
  persist(
    immer((set, get) => ({
      isInitialized: false,
      lastPlayed: null,
      view: 'TOWN',
      currentDungeon: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], affixes: [] },
      player: initialPlayerState,
      inventory: initialInventoryState,
      combat: initialCombatState,

      getXpToNextLevel: () => {
        const player = get().player;
        return player.level * 100;
      },

      initializeGameData: (data) => {
        set((state) => {
          state.gameData = data;
          state.isInitialized = true;
          // Set initial HP/Mana
          const player = state.player;
          player.resources.hp = formulas.calculateMaxHP(player.level, player.stats);
          player.resources.mana = formulas.calculateMaxMana(player.level, player.stats);
        });
      },

      enterDungeon: (dungeonId) => {
        const dungeon = get().gameData.dungeons.find(d => d.id === dungeonId);
        if (dungeon) {
          set(state => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.combat.killCount = 0;
            state.combat.log = [{ message: `Entered ${dungeon.name}.`, type: 'info', timestamp: Date.now() }];
          });
          get().startCombat();
          if(gameLoop) clearInterval(gameLoop);
          gameLoop = setInterval(() => get().gameTick(50), 50);
        }
      },
      
      startCombat: () => {
        const { currentDungeon, gameData } = get();
        if (!currentDungeon) return;
        
        const possibleMonsters = gameData.monsters.filter(m => m.biome.includes(currentDungeon.biome) && !m.isBoss);
        const randomMonster = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
        
        if (randomMonster) {
          const monsterInstance: Monster & { initialHp?: number } = JSON.parse(JSON.stringify(randomMonster));
          monsterInstance.initialHp = monsterInstance.stats.hp; // Store initial HP

          set(state => {
            state.combat.enemy = monsterInstance;
            state.combat.playerAttackProgress = 0;
            state.combat.enemyAttackProgress = 0;
            // Example: Enemy speed could be a stat later on
            state.combat.enemyAttackInterval = 2500;
            state.combat.log.push({ message: `A wild ${monsterInstance.name} appears!`, type: 'info', timestamp: Date.now() });
          });
        }
      },
      
      gameTick: (delta) => {
          const { playerAttack, enemyAttack, combat } = get();
          if(combat.autoAttack && combat.playerAttackProgress >= 1) {
            playerAttack();
          }
          if(combat.enemy && combat.enemyAttackProgress >= 1) {
            enemyAttack();
          }

          set(state => {
              if(state.view !== 'COMBAT' || !state.combat.enemy) {
                if(gameLoop) clearInterval(gameLoop);
                return;
              }

              if(state.combat.playerAttackProgress < 1) {
                  state.combat.playerAttackProgress += delta / state.combat.playerAttackInterval;
                  if (state.combat.playerAttackProgress > 1) {
                      state.combat.playerAttackProgress = 1;
                  }
              }
              if(state.combat.enemyAttackProgress < 1) {
                  state.combat.enemyAttackProgress += delta / state.combat.enemyAttackInterval;
                  if (state.combat.enemyAttackProgress > 1) {
                      state.combat.enemyAttackProgress = 1;
                  }
              }
          })
      },

      playerAttack: () => {
        const { player, combat, gameData, getXpToNextLevel } = get();
        if (!combat.enemy) return;

        // Player attacks enemy
        const pa = formulas.calculateAttackPower(player.stats);
        const damage = formulas.calculateMeleeDamage(5, 10, pa); // placeholder weapon damage
        const isCrit = formulas.isCriticalHit(formulas.calculateCritChance(player.stats.dex || 0, 0));
        const finalDamage = isCrit ? damage * formulas.CRIT_MULTIPLIER : damage;
        
        const dr = formulas.calculateArmorDR(combat.enemy.stats.armor, player.level);
        const mitigatedDamage = Math.round(finalDamage * (1 - dr));
        
        const attackMsg = `You hit ${combat.enemy.name} for ${mitigatedDamage} damage.`;
        const critMsg = `CRITICAL! You hit ${combat.enemy.name} for ${mitigatedDamage} damage.`;

        set(state => {
            state.combat.enemy!.stats.hp -= mitigatedDamage;
            state.combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
            state.combat.playerAttackProgress = 0;
        });

        if (get().combat.enemy!.stats.hp <= 0) {
            const enemy = get().combat.enemy!;
            const goldDrop = Math.floor(Math.random() * (enemy.drops.gold[1] - enemy.drops.gold[0] + 1)) + enemy.drops.gold[0];
            const itemDrop = resolveLoot(enemy, gameData);
            const xpGained = enemy.level * 10;

            set(state => {
                state.combat.log.push({ message: `You defeated ${enemy.name}!`, type: 'info', timestamp: Date.now() });
                state.combat.log.push({ message: `You find ${goldDrop} gold.`, type: 'loot', timestamp: Date.now() });
                state.inventory.gold += goldDrop;
                
                state.player.xp += xpGained;
                state.combat.log.push({ message: `You gain ${xpGained} experience.`, type: 'info', timestamp: Date.now() });

                // Level up check
                const xpToNextLevel = getXpToNextLevel();
                if (state.player.xp >= xpToNextLevel) {
                    state.player.level += 1;
                    state.player.xp -= xpToNextLevel;
                    state.player.talentPoints += 1;
                    // Basic stat increase on level up
                    state.player.stats.str += 2;
                    state.player.stats.int += 1;
                    state.player.stats.dex += 1;
                    state.player.stats.spi += 1;

                    state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                    
                    // Full heal on level up
                    state.player.resources.hp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    state.player.resources.mana = formulas.calculateMaxMana(state.player.level, state.player.stats);
                }


                if (itemDrop) {
                    state.inventory.items.push(itemDrop);
                    state.combat.log.push({ message: `You loot [${itemDrop.name}].`, type: 'loot', timestamp: Date.now() });
                }

                state.combat.killCount += 1;
                state.combat.enemy = null;
            });

            if (get().combat.killCount >= get().currentDungeon!.killTarget) {
                 set(state => {
                    state.combat.log.push({ message: `Dungeon complete! Returning to town.`, type: 'info', timestamp: Date.now() });
                    state.view = 'TOWN';
                 });
                 if(gameLoop) clearInterval(gameLoop);
            } else {
                 get().startCombat();
            }
        }
      },
      
      enemyAttack: () => {
        const { player, combat } = get();
        if (!combat.enemy) return;

        const enemyDamage = combat.enemy.stats.pa;
        const playerDr = formulas.calculateArmorDR(player.stats.armor, combat.enemy.level);
        const mitigatedEnemyDamage = Math.round(enemyDamage * (1 - playerDr));

        set(state => {
            state.player.resources.hp -= mitigatedEnemyDamage;
            state.combat.log.push({ message: `${combat.enemy!.name} hits you for ${mitigatedEnemyDamage} damage.`, type: 'enemy_attack', timestamp: Date.now() });
            state.combat.enemyAttackProgress = 0;
        });

        if (get().player.resources.hp <= 0) {
            set(state => {
                state.combat.log.push({ message: `You have been defeated! Returning to town.`, type: 'info', timestamp: Date.now() });
                state.player.resources.hp = formulas.calculateMaxHP(player.level, player.stats); // Heal on death
                state.view = 'TOWN';
            });
            if(gameLoop) clearInterval(gameLoop);
        }
      },

      flee: () => {
        set(state => {
            state.view = 'TOWN';
            state.combat.enemy = null;
            state.combat.log.push({ message: 'You fled from combat.', type: 'flee', timestamp: Date.now() });
        });
        if(gameLoop) clearInterval(gameLoop);
      },

      toggleAutoAttack: () => {
        set(state => {
          state.combat.autoAttack = !state.combat.autoAttack;
        });
      },
      
    })),
    {
      name: 'barquest-save',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          player: state.player, 
          inventory: state.inventory,
          lastPlayed: state.lastPlayed,
          isInitialized: state.isInitialized,
          combat: { // only persist autoAttack setting
            ...initialCombatState,
            autoAttack: state.combat.autoAttack
          }
      }),
      onRehydrateStorage: () => (state) => {
        if(state) {
            state.isInitialized = false;
        }
      }
    }
  )
);
