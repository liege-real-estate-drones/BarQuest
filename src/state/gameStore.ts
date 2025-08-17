
import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Skill, Affixe, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Classe, Quete, PlayerClassId, ResourceType, Rareté, CombatEnemy, Faction } from '@/lib/types';
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
    learnedSkills: {},
    learnedTalents: {},
    equippedSkills: [null, null, null, null],
    resources: {
      current: 0,
      max: 0,
      type: 'Mana',
    },
    reputation: {},
    activeEffects: [],
    completedDungeons: [],
  };
};

const initialInventoryState: InventoryState = {
  gold: 100,
  items: [],
  potions: 3,
  equipment: { weapon: null, head: null, chest: null, legs: null, hands: null, feet: null, belt: null, amulet: null, ring: null, ring2: null, trinket: null, offhand: null },
};

const initialCombatState: CombatState = {
  enemies: [],
  playerAttackInterval: 2000,
  playerAttackProgress: 0,
  killCount: 0,
  log: [],
  autoAttack: true,
  dungeonRunItems: [],
};

interface GameState {
  isInitialized: boolean;
  rehydrateComplete: boolean;
  lastPlayed: number | null;
  view: 'TOWN' | 'COMBAT';
  currentDungeon: Dungeon | null;
  gameData: GameData;
  player: PlayerState;
  inventory: InventoryState;
  combat: CombatState;
  activeQuests: ActiveQuete[];
  
  initializeGameData: (data: Partial<GameData>) => void;
  setPlayerClass: (classId: PlayerClassId) => void;
  checkAndAssignStarterSkill: () => void;
  recalculateStats: () => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: keyof InventoryState['equipment']) => void;
  buyItem: (item: Item) => boolean;
  sellItem: (itemId: string) => void;
  learnSkill: (skillId: string) => void;
  learnTalent: (talentId: string) => void;
  equipSkill: (skillId: string, slot: number) => void;
  unequipSkill: (slot: number) => void;
  resetGame: () => void;

  // Inn actions
  buyPotion: () => boolean;
  rest: () => boolean;
  usePotion: () => void;

  enterDungeon: (dungeonId: string) => void;
  startCombat: () => void;
  gameTick: (delta: number) => void;
  playerAttack: (targetId: string, isCleave?: boolean) => void;
  useSkill: (skillId: string) => void;
  enemyAttacks: () => void;
  handleEnemyDeath: (enemyId: string) => void;
  cycleTarget: () => void;
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
      item.slot !== 'potion' &&
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

const getTalentEffectValue = (effect: string, rank: number): number => {
    const matches = effect.match(/([\d\.\/]+)/);
    if (!matches) return 0;
    const values = matches[1].split('/').map(Number);
    return values[Math.min(rank - 1, values.length - 1)] || 0;
};

export const getItemSellPrice = (item: Item): number => {
    if (item.vendorPrice) {
        return Math.floor(item.vendorPrice / 4); // Sell for 25% of buy price
    }
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
      rehydrateComplete: false,
      lastPlayed: null,
      view: 'TOWN',
      currentDungeon: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], skills: [], affixes: [], classes: [], quests: [], factions: [] },
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
            state.gameData.dungeons = Array.isArray(data.dungeons) ? data.dungeons : [];
            state.gameData.monsters = Array.isArray(data.monsters) ? data.monsters : [];
            state.gameData.items = Array.isArray(data.items) ? data.items : [];
            state.gameData.talents = Array.isArray(data.talents) ? data.talents : [];
            state.gameData.skills = Array.isArray(data.skills) ? data.skills : [];
            state.gameData.affixes = Array.isArray(data.affixes) ? data.affixes : [];
            state.gameData.classes = Array.isArray(data.classes) ? data.classes : [];
            state.gameData.quests = Array.isArray(data.quests) ? data.quests : [];
            state.gameData.factions = Array.isArray(data.factions) ? data.factions : [];
            state.isInitialized = true;
        });
      },
      
      setPlayerClass: (classId: PlayerClassId) => {
        set(state => {
            const chosenClass = state.gameData.classes.find(c => c.id === classId);
            if (!chosenClass) return;

            // Full Reset
            state.player = getInitialPlayerState();
            state.inventory = initialInventoryState;
            state.combat = initialCombatState;
            state.activeQuests = [];
            
            const firstQuest = state.gameData.quests[0];
            if(firstQuest){
                 state.activeQuests.push({ quete: firstQuest, progress: 0 });
            }

            state.player.classeId = chosenClass.id as PlayerClassId;
            state.player.baseStats = chosenClass.statsBase;
            state.player.talentPoints = 1;

            let maxResource = formulas.calculateMaxMana(1, chosenClass.statsBase);
            let currentResource = maxResource;

            if (chosenClass.ressource === 'Rage') {
              maxResource = 100;
              currentResource = 0;
            } else if (chosenClass.ressource === 'Énergie') {
                maxResource = 100;
                currentResource = 100;
            }

            state.player.resources = {
                current: currentResource,
                max: maxResource,
                type: chosenClass.ressource as ResourceType,
            };
        });
        get().checkAndAssignStarterSkill();
        get().recalculateStats();
      },

      checkAndAssignStarterSkill: () => {
        set(state => {
            const { player, gameData } = state;
            if (!player.classeId || !gameData.skills || gameData.skills.length === 0) return;
            
            player.learnedSkills = player.learnedSkills || {};

            const hasAnySkillLearned = Object.keys(player.learnedSkills).length > 0;
            if (hasAnySkillLearned) return;

            const startingSkill = gameData.skills.find(s => 
                s.classeId === player.classeId && s.niveauRequis === 1
            );

            if (startingSkill) {
                player.learnedSkills[startingSkill.id] = 1;
                // The first skill is free and does not cost a talent point.
                if (player.equippedSkills.every(s => s === null)) {
                    player.equippedSkills[0] = startingSkill.id;
                }
            }
        });
      },

      recalculateStats: () => {
        set(state => {
          const { player, inventory, gameData } = state;
          if (!player.classeId) return;

          player.learnedSkills = player.learnedSkills || {};
          player.learnedTalents = player.learnedTalents || {};
          player.equippedSkills = player.equippedSkills || [null, null, null, null];
          player.reputation = player.reputation || {};
          player.activeEffects = player.activeEffects || [];
          player.completedDungeons = player.completedDungeons || [];
          inventory.potions = inventory.potions || 0;

          const classe = gameData.classes.find(c => c.id === player.classeId);
          if (!classe) return;

          const newStats: Stats = JSON.parse(JSON.stringify(player.baseStats));
          const newEffects: string[] = [];

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
          
          Object.entries(player.learnedTalents).forEach(([talentId, rank]) => {
              const talentData = gameData.talents.find(t => t.id === talentId);
              if (!talentData) return;
              
              talentData.effets.forEach(effectString => {
                  const value = getTalentEffectValue(effectString, rank);
                   if (effectString.includes('Armure')) {
                      newStats.Armure += (newStats.Armure * value) / 100;
                  } else if (effectString.includes('PV')) {
                      newStats.PV += (newStats.PV * value) / 100;
                  } else if (effectString.includes('dégâts de mêlée')) {
                      newStats.AttMin += (newStats.AttMin * value) / 100;
                      newStats.AttMax += (newStats.AttMax * value) / 100;
                  } else if (effectString.includes('Intelligence')) {
                      newStats.Intelligence = (newStats.Intelligence || 0) + ((newStats.Intelligence || 0) * value) / 100;
                  } else if (effectString.includes('Esquive')) {
                      newStats.Esquive += value;
                  } else if (effectString.includes('critique')) {
                      newStats.CritPct += value;
                  } else if (effectString.includes('Esprit')) {
                        newStats.Esprit = (newStats.Esprit || 0) + ((newStats.Esprit || 0) * value) / 100;
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
             player.resources.max = 100;
          }
          
          // Don't set HP to max on stat recalculation, only cap it if it's over.
          const currentHp = player.stats.PV;
          if (currentHp > maxHp) {
            player.stats.PV = maxHp;
          } else if(currentHp <= 0 && state.view !== 'COMBAT') { // If dead outside of combat, set to 1
             player.stats.PV = 1;
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

      buyItem: (item: Item) => boolean => {
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
              if (newItem.slot === 'potion') {
                  state.inventory.potions = (state.inventory.potions || 0) + 1;
              } else {
                  state.inventory.items.push(newItem);
              }
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

      learnSkill: (skillId: string) => {
        set(state => {
          const { player, gameData } = state;
          const skill = gameData.skills.find(s => s.id === skillId);
          if (!skill || player.talentPoints <= 0) return;

          const currentRank = player.learnedSkills[skillId] || 0;
          if (currentRank >= skill.rangMax) return;
          
          let canLearn = true;
          if (skill.exigences && skill.exigences.length > 0) {
            skill.exigences.forEach(req => {
              const [reqId, reqRank] = req.split(':');
              if ((player.learnedSkills[reqId] || 0) < Number(reqRank)) {
                canLearn = false;
              }
            });
          }

          if (canLearn) {
            player.learnedSkills[skillId] = currentRank + 1;
            player.talentPoints -= 1;
          }
        });
      },

      learnTalent: (talentId: string) => {
        set(state => {
          const { player, gameData } = state;
          const talent = gameData.talents.find(t => t.id === talentId);
          if (!talent || player.talentPoints <= 0) return;

          const currentRank = player.learnedTalents[talentId] || 0;
          if (currentRank >= talent.rangMax) return;
          
          let canLearn = true;
          if (talent.exigences && talent.exigences.length > 0) {
            talent.exigences.forEach(req => {
              const [reqId, reqRank] = req.split(':');
              if ((player.learnedSkills[reqId] || 0) < Number(reqRank)) {
                canLearn = false;
              }
            });
          }

          if (canLearn) {
            player.learnedTalents[talentId] = currentRank + 1;
            player.talentPoints -= 1;
          }
        });
        get().recalculateStats();
      },

      equipSkill: (skillId: string, slot: number) => {
        set(state => {
            if (slot < 0 || slot >= state.player.equippedSkills.length) return;
            
            // Unequip if it's already equipped in another slot
            const existingSlot = state.player.equippedSkills.indexOf(skillId);
            if (existingSlot !== -1) {
                state.player.equippedSkills[existingSlot] = null;
            }
            
            state.player.equippedSkills[slot] = skillId;
        });
      },

      unequipSkill: (slot: number) => {
        set(state => {
            if (slot < 0 || slot >= state.player.equippedSkills.length) return;
            state.player.equippedSkills[slot] = null;
        });
      },

      resetGame: () => {
        storage.removeItem('barquest-save');
        window.location.reload();
      },

      buyPotion: () => {
          const POTION_COST = 50;
          const { inventory } = get();
          if (inventory.gold < POTION_COST) {
              return false;
          }
          set(state => {
              state.inventory.gold -= POTION_COST;
              state.inventory.potions = (state.inventory.potions || 0) + 1;
          });
          return true;
      },

      rest: () => {
          const REST_COST = 25;
          const { inventory } = get();
          if (inventory.gold < REST_COST) {
              return false;
          }
          set(state => {
              state.inventory.gold -= REST_COST;
              const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
              state.player.stats.PV = maxHp;
              if (state.player.resources.type !== 'Rage') {
                  state.player.resources.current = state.player.resources.max;
              } else {
                  state.player.resources.current = 0;
              }
          });
          return true;
      },

      usePotion: () => {
          set(state => {
              if (state.inventory.potions > 0) {
                  const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                  const healAmount = Math.round(maxHp * 0.15);
                  state.player.stats.PV = Math.min(maxHp, state.player.stats.PV + healAmount);
                  state.inventory.potions -= 1;
                  state.combat.log.push({ message: `You use a potion and heal for ${healAmount} HP.`, type: 'heal', timestamp: Date.now() });
              }
          });
      },

      enterDungeon: (dungeonId) => {
        const dungeon = get().gameData.dungeons.find(d => d.id === dungeonId);
        if (dungeon) {
          set(state => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.combat = { ...initialCombatState, log: [{ message: `Entered ${dungeon.name}.`, type: 'info', timestamp: Date.now() }]};
            if (state.player.resources.type === 'Rage') {
              state.player.resources.current = 0;
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
        const monsterCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 monsters
        const newEnemies: CombatEnemy[] = [];

        for(let i=0; i<monsterCount; i++) {
          const randomMonsterTemplate = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
          if (randomMonsterTemplate) {
            const monsterInstance: CombatEnemy = {
              ...JSON.parse(JSON.stringify(randomMonsterTemplate)),
              id: uuidv4(), // Unique ID for this instance
              initialHp: randomMonsterTemplate.stats.PV,
              attackProgress: Math.random() // Stagger initial attacks
            };
            newEnemies.push(monsterInstance);
          }
        }
        
        if (newEnemies.length > 0) {
            set(state => {
              state.combat.enemies = newEnemies;
              state.combat.playerAttackProgress = 0;
              state.combat.playerAttackInterval = state.player.stats.Vitesse * 1000;
              state.combat.log.push({ message: `A group of ${newEnemies.map(e => e.nom).join(', ')} appears!`, type: 'info', timestamp: Date.now() });
            });
        }
      },
      
      gameTick: (delta) => {
          const { view, combat } = get();
          
          if(view !== 'COMBAT' || !combat.enemies || combat.enemies.length === 0) {
            if(gameLoop) clearInterval(gameLoop);
            return;
          }

          set(state => {
              if (state.combat.autoAttack && state.combat.playerAttackProgress < 1) {
                  state.combat.playerAttackProgress += delta / state.combat.playerAttackInterval;
              } else if (state.combat.autoAttack) {
                  state.combat.playerAttackProgress = 1;
              }

              state.combat.enemies.forEach(enemy => {
                  const attackInterval = enemy.stats.Vitesse * 1000;
                  if (enemy.attackProgress < 1) {
                      enemy.attackProgress += delta / attackInterval;
                  } else {
                      enemy.attackProgress = 1;
                  }
              });
          });

          const updatedState = get();
          if (updatedState.combat.autoAttack && updatedState.combat.playerAttackProgress >= 1 && updatedState.combat.enemies.length > 0) {
              get().playerAttack(updatedState.combat.enemies[0].id);
          }

          if (updatedState.combat.enemies.some(e => e.attackProgress >= 1)) {
              get().enemyAttacks();
          }
      },

      playerAttack: (targetId, isCleave = false) => {
        set(state => {
            const { player, combat } = state;
            const target = combat.enemies.find(e => e.id === targetId);
            if (!target) return;

            const damage = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
            const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, target.stats.Esquive);
            let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
            
            if (player.activeEffects && player.activeEffects.includes('dernier_cri')) {
                const maxHp = formulas.calculateMaxHP(player.level, player.stats);
                const hpPercent = (player.stats.PV / maxHp) * 100;
                const damageMultiplier = 1 + (100 - hpPercent) / 100;
                finalDamage *= damageMultiplier;
            }

            const dr = formulas.calculateArmorDR(target.stats.Armure, player.level);
            const mitigatedDamage = Math.round(finalDamage * (isCleave ? 0.5 : 1) * (1 - dr));
            
            target.stats.PV -= mitigatedDamage;

            const attackMsg = `You hit ${target.nom} for ${mitigatedDamage} damage.`;
            const critMsg = `CRITICAL! You hit ${target.nom} for ${mitigatedDamage} damage.`;
            if(!isCleave) {
                combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                combat.playerAttackProgress = 0;
            } else {
                 combat.log.push({ message: `Your cleave hits ${target.nom} for ${mitigatedDamage} damage.`, type: 'player_attack', timestamp: Date.now() });
            }

            if(player.resources.type === 'Rage' && !isCleave) {
              let rageGained = 5;
              const criDeGuerreRank = player.learnedTalents['berserker_battle_cry'] || 0;
              if (criDeGuerreRank > 0) {
                 const talent = state.gameData.talents.find(t => t.id === 'berserker_battle_cry');
                 if(talent) {
                   rageGained += getTalentEffectValue(talent.effets[0], criDeGuerreRank);
                 }
              }
              player.resources.current = Math.min(player.resources.max, player.resources.current + rageGained);
            }
        });
        
        const { player } = get();
        const cleaveRank = player.learnedTalents['berserker_cleave'] || 0;
        const enemies = get().combat.enemies;
        if (!isCleave && cleaveRank > 0 && enemies.length > 1) {
            const secondaryTarget = enemies.find(e => e.id !== targetId);
            if (secondaryTarget) {
                get().playerAttack(secondaryTarget.id, true);
            }
        }

        const deadEnemies = get().combat.enemies.filter(e => e.stats.PV <= 0).map(e => e.id);
        deadEnemies.forEach(id => get().handleEnemyDeath(id));
      },
      
      useSkill: (skillId: string) => {
        set(state => {
            const { player, combat, gameData } = state;
            if (!combat.enemies || combat.enemies.length === 0) return;

            const rank = player.learnedSkills[skillId];
            const skill = gameData.skills.find(t => t.id === skillId);
            if (!skill || !rank) return;

            const resourceCostMatch = skill.effets.join(' ').match(/Coûte (\d+) (Rage|Mana|Énergie)/);
            const resourceCost = resourceCostMatch ? parseInt(resourceCostMatch[1], 10) : 0;
            
            if (player.resources.current < resourceCost) {
                combat.log.push({ message: "Not enough resource!", type: 'info', timestamp: Date.now() });
                return;
            }
            player.resources.current -= resourceCost;

            const isAoE = skill.effets.join(' ').includes("tous les ennemis") || skill.effets.join(' ').includes("ennemis proches");
            const targets = isAoE ? [...combat.enemies] : [combat.enemies[0]];

            targets.forEach(target => {
                 let damage = 0;
                if (skill.classeId === 'berserker' || skill.classeId === 'rogue') {
                    const dmgMultiplier = getTalentEffectValue(skill.effets[0], rank) / 100;
                    const baseDmg = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
                    damage = baseDmg * dmgMultiplier;
                } else if (skill.classeId === 'mage' || skill.classeId === 'cleric') {
                    const baseDmg = getTalentEffectValue(skill.effets[0], rank);
                    damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(player.stats));
                }
                
                const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, target.stats.Esquive);
                let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
                const dr = formulas.calculateArmorDR(target.stats.Armure, player.level);
                const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                const msg = `You use ${skill.nom} on ${target.nom} for ${mitigatedDamage} damage.`;
                const critMsg = `CRITICAL! Your ${skill.nom} hits ${target.nom} for ${mitigatedDamage} damage.`;

                target.stats.PV -= mitigatedDamage;
                combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
            });
        });
        const deadEnemies = get().combat.enemies.filter(e => e.stats.PV <= 0).map(e => e.id);
        deadEnemies.forEach(id => get().handleEnemyDeath(id));
      },

      enemyAttacks: () => {
        const attackingEnemies = get().combat.enemies.filter(e => e.attackProgress >= 1);
        attackingEnemies.forEach(enemy => {
            set(state => {
                const playerDr = formulas.calculateArmorDR(state.player.stats.Armure, enemy.level);
                const enemyDamage = formulas.calculateMeleeDamage(enemy.stats.AttMin, enemy.stats.AttMax, formulas.calculateAttackPower(enemy.stats));
                const mitigatedEnemyDamage = Math.round(enemyDamage * (1 - playerDr));

                state.player.stats.PV -= mitigatedEnemyDamage;
                state.combat.log.push({ message: `${enemy.nom} hits you for ${mitigatedEnemyDamage} damage.`, type: 'enemy_attack', timestamp: Date.now() });
                
                const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                if (enemyInState) {
                    enemyInState.attackProgress = 0;
                }
            });
        });
        
        if (get().player.stats.PV <= 0) {
            set(state => {
                const goldPenalty = Math.floor(state.inventory.gold * 0.10);
                state.inventory.gold -= goldPenalty;
                state.combat.log.push({ message: `You have been defeated! You lose ${goldPenalty} gold and all items found in the dungeon. Returning to town.`, type: 'info', timestamp: Date.now() });
                
                const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                state.player.stats.PV = maxHp * 0.2;
                
                if (state.player.resources.type !== 'Rage') {
                  state.player.resources.current = state.player.resources.max * 0.2;
                } else {
                  state.player.resources.current = 0;
                }
                
                state.view = 'TOWN';
                if(gameLoop) clearInterval(gameLoop);
            });
        }
      },

      handleEnemyDeath: (enemyId: string) => {
        set(state => {
            const { gameData, currentDungeon } = state;
            const enemy = state.combat.enemies.find(e => e.id === enemyId);
            if (!enemy) return;

            const goldDrop = 5;
            const itemDrop = resolveLoot(enemy, gameData, state.player.classeId);
            const xpGained = enemy.level * 10;

            state.combat.log.push({ message: `You defeated ${enemy.nom}!`, type: 'info', timestamp: Date.now() });
            state.combat.log.push({ message: `You find ${goldDrop} gold.`, type: 'loot', timestamp: Date.now() });
            state.inventory.gold += goldDrop;
            
            state.player.xp += xpGained;
            state.combat.log.push({ message: `You gain ${xpGained} experience.`, type: 'info', timestamp: Date.now() });
            
             if (itemDrop) {
                state.combat.dungeonRunItems.push(itemDrop);
                state.combat.log.push({ 
                    message: ``,
                    type: 'loot', 
                    timestamp: Date.now(),
                    item: itemDrop 
                });
            }

            state.combat.killCount += 1;
            state.combat.enemies = state.combat.enemies.filter(e => e.id !== enemyId);

            // Quest progress
            state.activeQuests.forEach((activeQuest, index) => {
              if (currentDungeon && activeQuest.quete.requirements.dungeonId === currentDungeon.id) {
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

            // Level up check
            let leveledUp = false;
            let xpToNext = get().getXpToNextLevel();
            while(state.player.xp >= xpToNext) {
                state.player.level += 1;
                state.player.talentPoints += 1;
                leveledUp = true;
                 state.player.xp -= xpToNext;
                state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                xpToNext = get().getXpToNextLevel();
            }

            if (leveledUp) {
                const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                const maxMana = formulas.calculateMaxMana(state.player.level, state.player.stats);
                state.player.stats.PV = maxHp;
                if(state.player.resources.type !== 'Rage') {
                    state.player.resources.current = maxMana;
                }
                get().recalculateStats();
            }
        });
        
        const remainingEnemies = get().combat.enemies;
        const currentDungeon = get().currentDungeon;
        if (remainingEnemies.length === 0) {
            if (currentDungeon && get().combat.killCount >= currentDungeon.killTarget) {
                 set(state => {
                    if (!state.player.completedDungeons.includes(currentDungeon.id)) {
                      state.player.completedDungeons.push(currentDungeon.id);
                    }
                    state.inventory.items.push(...state.combat.dungeonRunItems);
                    state.combat.dungeonRunItems = [];
                    state.combat.log.push({ message: `Dungeon complete! Returning to town.`, type: 'info', timestamp: Date.now() });
                    state.view = 'TOWN';
                 });
                 if(gameLoop) clearInterval(gameLoop);
            } else {
                 get().startCombat();
            }
        }
      },

      cycleTarget: () => {
        set(state => {
            if (state.combat.enemies.length > 1) {
                // Move the first enemy to the end of the array
                const newTarget = state.combat.enemies.shift();
                if (newTarget) {
                    state.combat.enemies.push(newTarget);
                    state.combat.log.push({ message: `You are now targeting ${state.combat.enemies[0].nom}.`, type: 'info', timestamp: Date.now() });
                }
            }
        });
      },

      flee: () => {
        set(state => {
            state.view = 'TOWN';
            state.combat.enemies = [];
            state.inventory.items.push(...state.combat.dungeonRunItems);
            state.combat.dungeonRunItems = [];
            state.combat.log.push({ message: 'You fled from combat. Items found have been kept.', type: 'flee', timestamp: Date.now() });
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
      onRehydrateStorage: () => (state, error) => {
        if (state) {
            state.rehydrateComplete = true;
            state.view = 'TOWN';
            state.combat = initialCombatState;
            state.player.learnedTalents = state.player.learnedTalents || {};
        }
      }
    }
  )
);
