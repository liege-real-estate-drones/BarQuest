import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Affixe, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Classe, Quete } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { v4 as uuidv4 } from 'uuid';

export interface ActiveQuete {
  quete: Quete;
  progress: number;
}


const getInitialPlayerState = (classes: Classe[]): PlayerState => {
  const berserkerClass = classes.find(c => c.id === 'berserker');
  const baseStats = berserkerClass ? berserkerClass.statsBase : {
    PV: 120, AttMin: 6, AttMax: 10, CritPct: 5, CritDmg: 150,
    Armure: 15, Vitesse: 2.0, Precision: 95, Esquive: 5
  };
  
  return {
    name: "Hero",
    classeId: 'berserker',
    level: 1,
    xp: 0,
    baseStats: baseStats,
    stats: baseStats,
    talentPoints: 0,
    resources: {
      mana: 50,
    },
    reputation: {},
    activeEffects: [],
  };
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
  activeQuests: ActiveQuete[];
  
  initializeGameData: (data: GameData) => void;
  recalculateStats: () => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: keyof InventoryState['equipment']) => void;

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
  if (Math.random() > 0.5) { // 50% chance to drop anything
    return null;
  }
  
  const possibleItems = gameData.items.filter(item => 
      (item.tagsClasse?.includes('common') || item.tagsClasse?.includes('berserker')) && 
      item.niveauMin <= monster.level + 2 &&
      item.niveauMin >= monster.level - 2
  );

  if (possibleItems.length === 0) {
    return null;
  }

  const droppedItemTemplate = possibleItems[Math.floor(Math.random() * possibleItems.length)];
  const newItem: Item = JSON.parse(JSON.stringify(droppedItemTemplate));
  newItem.id = uuidv4(); // Give the dropped item a unique ID
  return newItem;
};

export const useGameStore = create<GameState>()(
  persist(
    immer((set, get) => ({
      isInitialized: false,
      lastPlayed: null,
      view: 'TOWN',
      currentDungeon: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], affixes: [], classes: [], quests: [], factions: [] },
      player: getInitialPlayerState([]),
      inventory: initialInventoryState,
      combat: initialCombatState,
      activeQuests: [],

      getXpToNextLevel: () => {
        const player = get().player;
        return Math.floor(100 * Math.pow(player.level, 1.5));
      },

      initializeGameData: (data) => {
        set((state) => {
          if (state.isInitialized) return;

          state.gameData = data;
          const initialPlayer = getInitialPlayerState(data.classes);
          state.player = initialPlayer;

          // Auto-start the first quest for demo purposes
          if (data.quests.length > 0 && state.activeQuests.length === 0) {
            state.activeQuests.push({ quete: data.quests[0], progress: 0 });
          }
          
          state.isInitialized = true;
        });
        get().recalculateStats();
      },

      recalculateStats: () => {
        set(state => {
          const { player, inventory, gameData } = state;
          const classe = gameData.classes.find(c => c.id === player.classeId);
          if (!classe) return;

          const newStats: Stats = { ...player.baseStats };
          const newEffects: string[] = [];

          // Add stats from equipment
          Object.values(inventory.equipment).forEach(item => {
            if (item) {
              item.affixes.forEach(affix => {
                const statKey = affix.ref as keyof Stats;
                if (statKey in newStats && typeof newStats[statKey] !== 'object') {
                    (newStats[statKey] as number) = (newStats[statKey] || 0) + (affix.val || 0);
                }
              });
              if (item.effect) {
                newEffects.push(item.effect);
              }
            }
          });

          player.stats = newStats;
          player.activeEffects = newEffects;
          
          const maxHp = formulas.calculateMaxHP(player.level, player.stats);
          const maxMana = formulas.calculateMaxMana(player.level, player.stats);

          // Heal to full if current HP/Mana is 0 or uninitialized
          if (!player.stats.PV || player.stats.PV > maxHp) {
            player.stats.PV = maxHp;
          }
           if (!player.resources.mana || player.resources.mana > maxMana) {
            player.resources.mana = maxMana;
          }
        });
      },

      equipItem: (itemId: string) => {
        const { inventory } = get();
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const itemToEquip = inventory.items[itemIndex];
        
        set(state => {
            // Remove from inventory
            state.inventory.items.splice(itemIndex, 1);
            
            const slot = itemToEquip.slot as keyof InventoryState['equipment'];
            
            // If an item is already in the slot, move it back to inventory
            const currentItem = state.inventory.equipment[slot];
            if (currentItem) {
                state.inventory.items.push(currentItem);
            }
            
            // Equip the new item
            state.inventory.equipment[slot] = itemToEquip;
        });

        get().recalculateStats();
      },
      
      unequipItem: (slot: keyof InventoryState['equipment']) => {
        set(state => {
            const item = state.inventory.equipment[slot];
            if (item) {
                state.inventory.items.push(item);
                state.inventory.equipment[slot] = null;
            }
        });
        get().recalculateStats();
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
        const randomMonsterTemplate = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
        
        if (randomMonsterTemplate) {
          const monsterInstance: Monstre & { initialHp?: number } = JSON.parse(JSON.stringify(randomMonsterTemplate));
          monsterInstance.initialHp = monsterInstance.stats.PV;

          set(state => {
            state.combat.enemy = monsterInstance;
            state.combat.playerAttackProgress = 0;
            state.combat.enemyAttackProgress = 0;
            state.combat.playerAttackInterval = state.player.stats.Vitesse * 1000;
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
        const { player, combat, gameData, getXpToNextLevel, recalculateStats } = get();
        if (!combat.enemy || !combat.enemy.stats) return;

        const damage = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
        const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, combat.enemy.stats.Esquive);
        let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
        
        // Apply effects
        if (player.activeEffects.includes('dernier_cri')) {
            const maxHp = formulas.calculateMaxHP(player.level, player.stats);
            const hpPercent = (player.stats.PV / maxHp) * 100;
            const damageMultiplier = 1 + (100 - hpPercent) / 100;
            finalDamage *= damageMultiplier;
        }

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

                // Quest Progress
                state.activeQuests.forEach((activeQuest, index) => {
                  if (activeQuest.quete.requirements.dungeonId === state.currentDungeon?.id) {
                    activeQuest.progress++;
                    if (activeQuest.progress >= activeQuest.quete.requirements.killCount) {
                      // Quest Complete
                      const quest = activeQuest.quete;
                      state.combat.log.push({ message: `Quest Complete: ${quest.name}!`, type: 'levelup', timestamp: Date.now() });
                      state.inventory.gold += quest.rewards.gold;
                      state.player.xp += quest.rewards.xp;
                      state.combat.log.push({ message: `You received ${quest.rewards.gold} gold and ${quest.rewards.xp} XP.`, type: 'loot', timestamp: Date.now() });

                      if (quest.rewards.reputation) {
                        const rep = quest.rewards.reputation;
                        state.player.reputation[rep.factionId] = (state.player.reputation[rep.factionId] || 0) + rep.amount;
                        state.combat.log.push({ message: `Your reputation with ${rep.factionId} increased by ${rep.amount}.`, type: 'info', timestamp: Date.now() });
                      }

                      // Remove completed quest and add the next one if available
                      state.activeQuests.splice(index, 1);
                      const nextQuestIndex = gameData.quests.findIndex(q => q.id === quest.id) + 1;
                      if (nextQuestIndex < gameData.quests.length) {
                        const nextQuest = gameData.quests[nextQuestIndex];
                        state.activeQuests.push({ quete: nextQuest, progress: 0 });
                        state.combat.log.push({ message: `New Quest: ${nextQuest.name}!`, type: 'info', timestamp: Date.now() });
                      }
                    }
                  }
                });

                const xpToNextLevel = getXpToNextLevel();
                if (state.player.xp >= xpToNextLevel) {
                    state.player.level += 1;
                    state.player.xp -= xpToNextLevel;
                    state.player.talentPoints += 1;
                    
                    state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                    
                    recalculateStats();

                    const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    const maxMana = formulas.calculateMaxMana(state.player.level, state.player.stats);
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
        const { player, combat, recalculateStats } = get();
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
                state.view = 'TOWN';
                
                // On respawn, restore HP/MANA
                recalculateStats();
                const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                const maxMana = formulas.calculateMaxMana(state.player.level, state.player.stats);
                state.player.stats.PV = maxHp;
                state.player.resources.mana = maxMana;
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
      onRehydrateStorage: () => (state) => {
        if(state) {
            state.isInitialized = false; // Will force re-init with latest data files
        }
      }
    }
  )
);
