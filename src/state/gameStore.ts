import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Affixe, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData } from '@/lib/types';
import * as formulas from '@/core/formulas';


const initialPlayerState: PlayerState = {
  name: "Hero",
  classe: 'berserker',
  level: 1,
  xp: 0,
  stats: { 
    PV: 120, 
    Force: 10,
    Intelligence: 5,
    Dexterite: 7,
    Esprit: 8,
    AttMin: 6, 
    AttMax: 10, 
    CritPct: 5, 
    CritDmg: 150, 
    Armure: 15, 
    Vitesse: 2.0, 
    Precision: 95, 
    Esquive: 5 
  },
  talentPoints: 0,
  resources: {
    mana: 50,
  },
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

let gameLoop: any = null;

const resolveLoot = (monster: Monstre, gameData: GameData): Item | null => {
  if (!monster.lootTableId) {
    return null;
  }

  // For now, let's keep it simple: 25% chance to drop any item from its tables
  if (Math.random() > 0.25) {
    return null;
  }
  
  const possibleItems = gameData.items.filter(item => 
      item.tagsClasse?.includes('common') && // A simplified stand-in for table resolution
      item.niveauMin <= monster.level + 2 // Item level constraint
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
          // Recalculate max HP and Mana based on loaded stats
          const maxHp = formulas.calculateMaxHP(state.player);
          const maxMana = formulas.calculateMaxMana(state.player);
          state.player.stats.PV = maxHp;
          state.player.resources.mana = maxMana;
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
        
        const possibleMonsters = gameData.monsters.filter(m => m.palier === currentDungeon.palier && !m.isBoss);
        const randomMonster = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
        
        if (randomMonster) {
          const monsterInstance: Monstre & { initialHp?: number } = JSON.parse(JSON.stringify(randomMonster));
          monsterInstance.initialHp = monsterInstance.stats.PV; // Store initial HP

          set(state => {
            state.combat.enemy = monsterInstance;
            state.combat.playerAttackProgress = 0;
            state.combat.enemyAttackProgress = 0;
            state.combat.enemyAttackInterval = monsterInstance.stats.Vitesse * 1000;
            state.combat.log.push({ message: `A wild ${monsterInstance.nom} appears!`, type: 'info', timestamp: Date.now() });
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
        if (!combat.enemy || !combat.enemy.stats) return;

        // Player attacks enemy
        const damage = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
        const isCrit = formulas.isCriticalHit(player.stats.CritPct);
        const finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
        
        const dr = formulas.calculateArmorDR(combat.enemy.stats.Armure, player.level);
        const mitigatedDamage = Math.round(finalDamage * (1 - dr));
        
        const attackMsg = `You hit ${combat.enemy.nom} for ${mitigatedDamage} damage.`;
        const critMsg = `CRITICAL! You hit ${combat.enemy.nom} for ${mitigatedDamage} damage.`;

        set(state => {
            if (state.combat.enemy?.stats.PV) {
                state.combat.enemy.stats.PV -= mitigatedDamage;
            }
            state.combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
            state.combat.playerAttackProgress = 0;
        });

        if (get().combat.enemy!.stats.PV! <= 0) {
            const enemy = get().combat.enemy!;
            const goldDrop = 5; // Placeholder
            const itemDrop = resolveLoot(enemy, gameData);
            const xpGained = enemy.level * 10;

            set(state => {
                state.combat.log.push({ message: `You defeated ${enemy.nom}!`, type: 'info', timestamp: Date.now() });
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
                    
                    // Basic stat increase on level up - this should be driven by data later
                    state.player.stats.AttMin += 1;
                    state.player.stats.AttMax += 1;
                    state.player.stats.Armure += 5;
                    state.player.stats.Force! += 1;


                    state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                    
                    // Full heal on level up
                    const maxHp = formulas.calculateMaxHP(state.player);
                    const maxMana = formulas.calculateMaxMana(state.player);
                    state.player.stats.PV = maxHp;
                    state.player.resources.mana = maxMana;
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
        if (!combat.enemy || !combat.enemy.stats) return;

        const enemyDamage = formulas.calculateMeleeDamage(combat.enemy.stats.AttMin, combat.enemy.stats.AttMax, formulas.calculateAttackPower(combat.enemy.stats));
        const playerDr = formulas.calculateArmorDR(player.stats.Armure, combat.enemy.level);
        const mitigatedEnemyDamage = Math.round(enemyDamage * (1 - playerDr));

        set(state => {
            state.player.stats.PV -= mitigatedEnemyDamage;
            state.combat.log.push({ message: `${combat.enemy!.nom} hits you for ${mitigatedEnemyDamage} damage.`, type: 'enemy_attack', timestamp: Date.now() });
            state.combat.enemyAttackProgress = 0;
        });

        if (get().player.stats.PV <= 0) {
            set(state => {
                state.combat.log.push({ message: `You have been defeated! Returning to town.`, type: 'info', timestamp: Date.now() });
                state.player.stats.PV = formulas.calculateMaxHP(player); // Heal on death
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