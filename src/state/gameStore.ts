

import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Affixe, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Classe, Quete, PlayerClassId, ResourceType, Rareté } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { v4 as uuidv4 } from 'uuid';

export interface ActiveQuete {
  quete: Quete;
  progress: number;
}


const getInitialPlayerState = (): PlayerState => {
  return {
    name: "Hero",
    classeId: null,
    level: 1,
    xp: 0,
    baseStats: {} as Stats,
    stats: {} as Stats,
    talentPoints: 0,
    talents: {},
    resources: {
      current: 0,
      max: 0,
      type: 'Mana',
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
  setPlayerClass: (classId: PlayerClassId) => void;
  recalculateStats: () => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: keyof InventoryState['equipment']) => void;
  buyItem: (item: Item) => boolean;
  sellItem: (itemId: string) => void;
  learnTalent: (talentId: string) => void;
  resetGame: () => void;

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

const rarityDropChances: Record<Rareté, number> = {
  Commun: 0.7,
  Rare: 0.25,
  Épique: 0.04,
  Légendaire: 0.01,
  Unique: 0.0, // Uniques are special drops
};

const resolveLoot = (monster: Monstre, gameData: GameData, playerClassId: PlayerClassId | null): Item | null => {
  if (Math.random() > 0.5) { // 50% chance to drop anything
    return null;
  }
  
  // Determine rarity
  const dropRoll = Math.random();
  let cumulativeChance = 0;
  let chosenRarity: Rareté | null = null;

  for (const [rarity, chance] of Object.entries(rarityDropChances)) {
    cumulativeChance += chance;
    if (dropRoll < cumulativeChance) {
      chosenRarity = rarity as Rareté;
      break;
    }
  }

  if (!chosenRarity) {
    return null;
  }

  const possibleItems = gameData.items.filter(item => 
      item.rarity === chosenRarity &&
      (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId))) && 
      item.niveauMin <= monster.level + 2 &&
      item.niveauMin >= monster.level - 5
  );

  if (possibleItems.length === 0) {
    return null;
  }

  const droppedItemTemplate = possibleItems[Math.floor(Math.random() * possibleItems.length)];
  const newItem: Item = JSON.parse(JSON.stringify(droppedItemTemplate));
  newItem.id = uuidv4(); // Give the dropped item a unique ID
  return newItem;
};

// Helper to parse talent effects. E.g. "+5/10/15% armure" for rank 2 -> 10
const getTalentEffectValue = (effect: string, rank: number): number => {
    const matches = effect.match(/([\d/]+)/);
    if (!matches) return 0;
    const values = matches[1].split('/').map(Number);
    return values[Math.min(rank - 1, values.length - 1)] || 0;
};

export const getItemSellPrice = (item: Item): number => {
    if (item.vendorPrice) {
        return Math.floor(item.vendorPrice / 4); // Sell for 25% of buy price
    }
    // Fallback for non-vendor items
    const rarityMultiplier: Record<Rareté, number> = {
        Commun: 1,
        Rare: 2.5,
        Épique: 5,
        Légendaire: 10,
        Unique: 20,
    };
    return Math.ceil(item.niveauMin * rarityMultiplier[item.rarity]);
};

const storage = createJSONStorage(() => localStorage);

export const useGameStore = create<GameState>()(
  persist(
    immer((set, get) => ({
      isInitialized: false,
      lastPlayed: null,
      view: 'TOWN',
      currentDungeon: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], affixes: [], classes: [], quests: [], factions: [] },
      player: getInitialPlayerState(),
      inventory: initialInventoryState,
      combat: initialCombatState,
      activeQuests: [],

      getXpToNextLevel: () => {
        const player = get().player;
        if (!player.level) return 100;
        return Math.floor(100 * Math.pow(player.level, 1.5));
      },

      initializeGameData: (data) => {
        set((state) => {
          if (state.isInitialized) return;
          state.gameData = data;
          
          if (state.player.classeId) {
             const savedPlayer = JSON.parse(JSON.stringify(state.player));
             const currentClass = data.classes.find(c => c.id === savedPlayer.classeId);
             state.player = {
                ...getInitialPlayerState(),
                ...savedPlayer,
                baseStats: currentClass ? currentClass.statsBase : getInitialPlayerState().baseStats,
             };
          } else {
            state.isInitialized = true;
            return;
          }

          if (data.quests.length > 0 && state.activeQuests.length === 0) {
            state.activeQuests.push({ quete: data.quests[0], progress: 0 });
          }
          
          state.isInitialized = true;
        });
        if(get().player.classeId) {
            get().recalculateStats();
        }
      },
      
      setPlayerClass: (classId: PlayerClassId) => {
        set(state => {
            const chosenClass = state.gameData.classes.find(c => c.id === classId);
            if (!chosenClass) return;

            state.player = getInitialPlayerState();

            state.player.classeId = chosenClass.id as PlayerClassId;
            state.player.baseStats = chosenClass.statsBase;
            state.player.stats = chosenClass.statsBase;
            state.player.activeEffects = [];
            state.player.reputation = {};
            state.player.talents = {};

            let maxResource = formulas.calculateMaxMana(1, chosenClass.statsBase);
            let currentResource = maxResource;

            if (chosenClass.ressource === 'Rage') {
              maxResource = 100; // Rage is usually capped at 100
              currentResource = 0; // Start with 0 rage
            }

            state.player.resources = {
                current: currentResource,
                max: maxResource,
                type: chosenClass.ressource as ResourceType,
            };
            
            state.player.stats.PV = formulas.calculateMaxHP(1, chosenClass.statsBase);
        });
        get().recalculateStats();
      },

      recalculateStats: () => {
        set(state => {
          const { player, inventory, gameData } = state;
          if (!player.classeId) return;

          // Ensure talents and reputation are objects
          if (!player.talents) player.talents = {};
          if (!player.reputation) player.reputation = {};
          if (!player.activeEffects) player.activeEffects = [];

          const classe = gameData.classes.find(c => c.id === player.classeId);
          if (!classe) return;

          // Start with a fresh copy of base stats for the current level
          const newStats: Stats = JSON.parse(JSON.stringify(player.baseStats));
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
          
          // Add stats from talents
          Object.entries(player.talents).forEach(([talentId, rank]) => {
              const talentData = gameData.talents.find(t => t.id === talentId);
              if (!talentData) return;
              
              talentData.effets.forEach(effectString => {
                  const value = getTalentEffectValue(effectString, rank);
                  // This is a simplified implementation. A more robust solution would
                  // parse the effect string more carefully to identify the stat and whether
                  // the bonus is flat or a percentage.
                   if (effectString.includes('armure')) {
                      newStats.Armure += (newStats.Armure * value) / 100;
                  } else if (effectString.includes('PV max')) {
                      newStats.PV += (newStats.PV * value) / 100;
                  } else if (effectString.includes('dégâts de mêlée')) {
                      newStats.AttMin += (newStats.AttMin * value) / 100;
                      newStats.AttMax += (newStats.AttMax * value) / 100;
                  }
              });
          });


          player.stats = newStats;
          player.activeEffects = newEffects;
          
          const maxHp = formulas.calculateMaxHP(player.level, player.stats);
          if (classe.ressource !== 'Rage') {
            const maxMana = formulas.calculateMaxMana(player.level, player.stats);
            player.resources.max = maxMana;
             if (player.resources.current > player.resources.max) {
                player.resources.current = player.resources.max;
            }
          } else {
             player.resources.max = 100; // Rage is capped
          }


          if (player.stats.PV <= 0) { // If dead, respawn with full health
            player.stats.PV = maxHp;
          } else if (player.stats.PV > maxHp) { // Don't overflow health
            player.stats.PV = maxHp;
          }
        });
      },

      equipItem: (itemId: string) => {
        const { inventory } = get();
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const itemToEquip = inventory.items[itemIndex];
        
        set(state => {
            state.inventory.items.splice(itemIndex, 1);
            const slot = itemToEquip.slot as keyof InventoryState['equipment'];
            const currentItem = state.inventory.equipment[slot];
            if (currentItem) {
                state.inventory.items.push(currentItem);
            }
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

      buyItem: (item: Item): boolean => {
          const { inventory } = get();
          const price = item.vendorPrice || 0;
          if (price <= 0 || inventory.gold < price) {
              return false;
          }

          const newItem: Item = JSON.parse(JSON.stringify(item));
          newItem.id = uuidv4();
          delete newItem.vendorPrice;

          set(state => {
              state.inventory.gold -= price;
              state.inventory.items.push(newItem);
          });
          return true;
      },
      
      sellItem: (itemId: string) => {
        set(state => {
            const itemIndex = state.inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return;

            const itemToSell = state.inventory.items[itemIndex];
            const sellPrice = getItemSellPrice(itemToSell);
            
            state.inventory.gold += sellPrice;
            state.inventory.items.splice(itemIndex, 1);
        });
      },

      learnTalent: (talentId: string) => {
        set(state => {
          const { player, gameData } = state;
          const talent = gameData.talents.find(t => t.id === talentId);
          if (!talent || player.talentPoints <= 0) return;

          const currentRank = player.talents[talentId] || 0;
          if (currentRank >= talent.rangMax) return;
          
          // Check requirements
          let canLearn = true;
          if (talent.exigences && talent.exigences.length > 0) {
            talent.exigences.forEach(req => {
              const [reqId, reqRank] = req.split(':');
              if ((player.talents[reqId] || 0) < Number(reqRank)) {
                canLearn = false;
              }
            });
          }

          if (canLearn) {
            player.talents[talentId] = currentRank + 1;
            player.talentPoints -= 1;
          }
        });
        get().recalculateStats();
      },

      resetGame: () => {
        storage.removeItem('barquest-save');
        window.location.reload();
      },

      enterDungeon: (dungeonId) => {
        const dungeon = get().gameData.dungeons.find(d => d.id === dungeonId);
        if (dungeon) {
          set(state => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.combat.killCount = 0;
            state.combat.log = [{ message: `Entered ${dungeon.name}.`, type: 'info', timestamp: Date.now() }];
            if (state.player.resources.type === 'Rage') {
              state.player.resources.current = 0; // Reset rage on entering dungeon
            }
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
        const { player, combat, gameData, getXpToNextLevel } = get();
        if (!combat.enemy || !combat.enemy.stats || !player) return;

        const damage = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
        const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, combat.enemy.stats.Esquive);
        let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
        
        // Apply effects
        if (player.activeEffects && player.activeEffects.includes('dernier_cri')) {
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
            if(!state.combat.enemy) return;
            state.combat.enemy.stats.PV -= mitigatedDamage;

            // Rage Generation
            if(state.player.resources.type === 'Rage') {
              let rageGained = 5;
              const criDeGuerreRank = state.player.talents['wr3'] || 0;
              if (criDeGuerreRank > 0) {
                 const talent = state.gameData.talents.find(t => t.id === 'wr3');
                 if(talent) {
                   rageGained += getTalentEffectValue(talent.effets[0], criDeGuerreRank);
                 }
              }
              state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + rageGained);
            }

            state.combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
            state.combat.playerAttackProgress = 0;
        });

        if (get().combat.enemy!.stats.PV! <= 0) {
            const enemy = get().combat.enemy!;
            const goldDrop = 5;
            const itemDrop = resolveLoot(enemy, gameData, get().player.classeId);
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
                      const quest = activeQuest.quete;
                      state.combat.log.push({ message: `Quest Complete: ${quest.name}!`, type: 'levelup', timestamp: Date.now() });
                      state.inventory.gold += quest.rewards.gold;
                      state.player.xp += quest.rewards.xp;
                      state.combat.log.push({ message: `You received ${quest.rewards.gold} gold and ${quest.rewards.xp} XP.`, type: 'loot', timestamp: Date.now() });

                      if (quest.rewards.reputation) {
                        const rep = quest.rewards.reputation;
                        state.player.reputation[rep.factionId] = (state.player.reputation[rep.factionId] || 0) + rep.amount;
                        state.combat.log.push({ message: `Your reputation with ${gameData.factions.find(f => f.id === rep.factionId)?.name || 'a faction'} increased by ${rep.amount}.`, type: 'info', timestamp: Date.now() });
                      }

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

                let leveledUp = false;
                let xpToNext = getXpToNextLevel();
                while(state.player.xp >= xpToNext) {
                    state.player.level += 1;
                    state.player.xp -= xpToNext;
                    state.player.talentPoints += 1;
                    leveledUp = true;
                    state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                    xpToNext = getXpToNextLevel(); // Recalculate for next level
                }

                if (leveledUp) {
                    // Recalculate stats and heal in a separate step
                }

                if (itemDrop) {
                    state.inventory.items.push(itemDrop);
                    state.combat.log.push({ 
                        message: `You loot [${itemDrop.name}].`, 
                        type: 'loot', 
                        timestamp: Date.now(),
                        item: itemDrop 
                    });
                }

                state.combat.killCount += 1;
                state.combat.enemy = null;
            });
            
            // Post-defeat processing
            const didLevelUp = get().combat.log.length > 0 && get().combat.log[get().combat.log.length - 1].type === 'levelup';
             if (didLevelUp) {
                 get().recalculateStats();
                 set(state => {
                    const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    const maxMana = formulas.calculateMaxMana(state.player.level, state.player.stats);
                    state.player.stats.PV = maxHp;
                    if(state.player.resources.type !== 'Rage') {
                        state.player.resources.current = maxMana;
                    }
                 });
             }

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
        if (!combat.enemy || !combat.enemy.stats || !player) return;

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
                // HP/MANA are restored in recalculateStats now
            });
            get().recalculateStats(); // Recalculate stats on death to heal
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
      storage: storage,
      onRehydrateStorage: () => (state) => {
        if(state) {
          // state.isInitialized = false; 
        }
      }
    }
  )
);

    