import create from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Skill, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Quete, PlayerClassId, ResourceType, Rareté, CombatEnemy, ItemSet, PotionType } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { v4 as uuidv4 } from 'uuid';

export interface ActiveQuete {
  quete: Quete;
  progress: number;
  startTime?: number; // Pour les quêtes de temps
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
    activeSetBonuses: [],
    completedDungeons: {},
    completedQuests: [],
  };
};

const initialInventoryState: InventoryState = {
  gold: 100,
  items: [],
  potions: { health: 3, resource: 1 },
  equipment: { weapon: null, head: null, chest: null, legs: null, hands: null, feet: null, belt: null, amulet: null, ring: null, ring2: null, trinket: null, offhand: null },
};

const initialCombatState: CombatState = {
  enemies: [],
  playerAttackInterval: 2000,
  playerAttackProgress: 0,
  skillCooldowns: {},
  killCount: 0,
  log: [],
  autoAttack: true,
  dungeonRunItems: [],
  targetIndex: 0,
};

interface GameState {
  isInitialized: boolean;
  rehydrateComplete: boolean;
  lastPlayed: number | null;
  view: 'TOWN' | 'COMBAT';
  currentDungeon: Dungeon | null;
  dungeonStartTime: number | null;
  gameData: GameData;
  player: PlayerState;
  inventory: InventoryState;
  combat: CombatState;
  activeQuests: ActiveQuete[];
  proposedQuest: Quete | null;
  bossEncounter: Monstre | null; // NOUVEAU: Pour l'alerte d'apparition du boss

  setBossEncounter: (monster: Monstre | null) => void; // NOUVEAU: Action pour gérer l'alerte
  setProposedQuest: (quest: Quete | null) => void;
  initializeGameData: (data: Partial<GameData>) => void;
  setPlayerClass: (classId: PlayerClassId) => void;
  recalculateStats: () => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: keyof InventoryState['equipment']) => void;
  buyItem: (item: Item) => boolean;
  sellItem: (itemId: string) => void;
  sellAllUnusedItems: () => { soldCount: number; goldGained: number };
  learnSkill: (skillId: string) => void;
  learnTalent: (talentId: string) => void;
  equipSkill: (skillId: string, slot: number) => void;
  unequipSkill: (slot: number) => void;
  resetGame: () => void;

  // Inn actions
  buyPotion: (potionType: PotionType) => boolean;
  rest: () => boolean;
  usePotion: (potionType: PotionType) => void;

  // Quest actions
  acceptQuest: (questId: string) => void;

  enterDungeon: (dungeonId: string) => void;
  startCombat: () => void;
  gameTick: (delta: number) => void;
  playerAttack: (targetId: string, isCleave?: boolean, skillId?: string) => void;
  useSkill: (skillId: string) => void;
  enemyAttacks: () => void;
  handleEnemyDeath: (enemy: CombatEnemy, skillId?: string) => void;
  cycleTarget: () => void;
  flee: () => void;
  toggleAutoAttack: () => void;
  getXpToNextLevel: () => number;
}

let gameLoop: NodeJS.Timeout | null = null;

const rarityDropChances: Record<Rareté, number> = {
  Commun: 0.7,
  Rare: 0.25,
  Épique: 0.04,
  Légendaire: 0.01,
  Unique: 0.0,
};

const scaleAffixValue = (baseValue: number, level: number): number => {
    return Math.round(baseValue + (baseValue * level * 0.15));
};

const resolveLoot = (monster: Monstre, gameData: GameData, playerClassId: PlayerClassId | null, activeQuests: ActiveQuete[]): Item | null => {
  for (const activeQuest of activeQuests) {
    const { quete } = activeQuest;
    if (quete.type === 'collecte' && quete.requirements.itemId && monster.questItemId === quete.requirements.itemId) {
      if ((activeQuest.progress || 0) < (quete.requirements.itemCount || 0)) {
        const questItem = gameData.items.find(item => item.id === quete.requirements.itemId);
        if (questItem) {
          if (Math.random() < 0.3) {
            return { ...questItem, id: uuidv4() };
          }
        }
      }
    }
  }

  if (Math.random() < 0.02) {
    const possibleSetItems = gameData.items.filter(item =>
      item.set &&
      (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
    );
    if (possibleSetItems.length > 0) {
      const droppedItemTemplate = possibleSetItems[Math.floor(Math.random() * possibleSetItems.length)];
      const newItem: Item = JSON.parse(JSON.stringify(droppedItemTemplate));
      newItem.id = uuidv4();
      newItem.niveauMin = monster.level;

      const newAffixes = (newItem.affixes || []).map(affix => {
          const affixTemplate = gameData.affixes.find(a => a.id === affix.ref);
          const baseValue = affixTemplate?.portée[0] ?? 1;
          return {
              ...affix,
              val: scaleAffixValue(baseValue, monster.level)
          }
      });
      newItem.affixes = newAffixes;

      return newItem;
    }
  }

  if (Math.random() > 0.5) {
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

  const possibleItemTemplates = gameData.items.filter(item =>
      item.rarity === chosenRarity &&
      !item.set &&
      item.slot !== 'potion' &&
      (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
  );

  if (possibleItemTemplates.length === 0) {
    return null;
  }

  const droppedItemTemplate = possibleItemTemplates[Math.floor(Math.random() * possibleItemTemplates.length)];
  const newItem: Item = JSON.parse(JSON.stringify(droppedItemTemplate));
  newItem.id = uuidv4();
  newItem.niveauMin = monster.level;

  const newAffixes = (newItem.affixes || []).map(affix => {
      const affixTemplate = gameData.affixes.find(a => a.id === affix.ref);
      const baseValue = affixTemplate?.portée[0] ?? 1;
      return {
          ...affix,
          val: scaleAffixValue(baseValue, monster.level)
      }
  });
  newItem.affixes = newAffixes;

  return newItem;
};

const getTalentEffectValue = (effect: string, rank: number): number => {
    const matches = effect.match(/([\d./]+)/);
    if (!matches) return 0;
    const values = matches[1].split('/').map(Number);
    return values[Math.min(rank - 1, values.length - 1)] || 0;
};

export const getItemSellPrice = (item: Item): number => {
    if (item.vendorPrice) {
        return Math.floor(item.vendorPrice / 4);
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

const STAT_WEIGHTS: Record<PlayerClassId, Partial<Record<keyof Stats, number>>> = {
    berserker: { Force: 2, AttMin: 1, AttMax: 1, CritDmg: 0.8, Armure: 0.7, PV: 0.5, CritPct: 0.5 },
    mage: { Intelligence: 2, Esprit: 1.2, CritPct: 1, CritDmg: 0.8, PV: 0.5, Vitesse: 0.7 },
    rogue: { Dexterite: 2, CritPct: 1.5, CritDmg: 1.2, Vitesse: 1, AttMin: 0.8, AttMax: 0.8 },
    cleric: { Esprit: 2, Intelligence: 1.5, PV: 1, Armure: 0.8, Vitesse: 0.5 },
};

export const calculateItemScore = (item: Item, classId: PlayerClassId): number => {
    let score = 0;
    const weights = STAT_WEIGHTS[classId];

    item.affixes.forEach(affix => {
        const statKey = affix.ref as keyof Stats;
        const weight = weights[statKey] || 0.1;
        score += affix.val * weight;
    });

    if (item.stats) {
        Object.entries(item.stats).forEach(([key, value]) => {
            const statKey = key as keyof Stats;
            const weight = weights[statKey] || 0.1;
            if (typeof value === 'number') {
                score += value * weight;
            }
        });
    }

    return score;
}

const dummyStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : createJSONStorage(() => dummyStorage);

export const useGameStore = create<GameState>()(
  persist(
    immer((set, get) => ({
      isInitialized: false,
      rehydrateComplete: false,
      lastPlayed: null,
      view: 'TOWN',
      currentDungeon: null,
      dungeonStartTime: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], skills: [], affixes: [], classes: [], quests: [], factions: [], sets: [] },
      player: getInitialPlayerState(),
      inventory: initialInventoryState,
      combat: initialCombatState,
      activeQuests: [],
      proposedQuest: null,
      bossEncounter: null, // NOUVEAU: Initialisation de l'état du boss

      // NOUVEAU: Implémentation de l'action pour le boss
      setBossEncounter: (monster) => {
        set({ bossEncounter: monster });
      },

      setProposedQuest: (quest) => {
        set({ proposedQuest: quest });
      },

      getXpToNextLevel: () => {
        const player = get().player;
        if (!player.level) return 100;
        return Math.floor(100 * Math.pow(player.level, 1.5));
      },

      initializeGameData: (data: Partial<GameData>) => {
        set((state: GameState) => {
            state.gameData.dungeons = Array.isArray(data.dungeons) ? data.dungeons : [];
            state.gameData.monsters = Array.isArray(data.monsters) ? data.monsters : [];
            state.gameData.items = Array.isArray(data.items) ? data.items : [];
            state.gameData.talents = Array.isArray(data.talents) ? data.talents : [];
            state.gameData.skills = Array.isArray(data.skills) ? data.skills : [];
            state.gameData.affixes = Array.isArray(data.affixes) ? data.affixes : [];
            state.gameData.classes = Array.isArray(data.classes) ? data.classes : [];
            state.gameData.quests = Array.isArray(data.quests) ? data.quests : [];
            state.gameData.factions = Array.isArray(data.factions) ? data.factions : [];
            state.gameData.sets = Array.isArray(data.sets) ? data.sets : [];
            state.isInitialized = true;
        });
      },

      setPlayerClass: (classId: PlayerClassId) => {
        set((state: GameState) => {
            const chosenClass = state.gameData.classes.find(c => c.id === classId);
            if (!chosenClass) return;

            state.player = getInitialPlayerState();
            state.inventory = initialInventoryState;
            state.combat = initialCombatState;
            state.activeQuests = [];

            state.player.classeId = chosenClass.id as PlayerClassId;
            state.player.baseStats = { ...chosenClass.statsBase };
            state.player.talentPoints = 1;
            state.player.resources.type = chosenClass.ressource;

            const startingSkills = state.gameData.skills.filter(s => s.classeId === classId && s.niveauRequis === 1);

            startingSkills.slice(0, 4).forEach((skill, index) => {
                if (skill) {
                    state.player.learnedSkills[skill.id] = 1;
                    state.player.equippedSkills[index] = skill.id;
                }
            });
        });
        get().recalculateStats();
      },

      recalculateStats: () => {
        set((state: GameState) => {
          const { player, inventory, gameData } = state;
          if (!player.classeId) return;

          player.learnedSkills = player.learnedSkills || {};
          player.learnedTalents = player.learnedTalents || {};
          player.equippedSkills = player.equippedSkills || [null, null, null, null];
          player.reputation = player.reputation || {};
          player.activeEffects = player.activeEffects || [];
          player.activeSetBonuses = [];
          player.completedDungeons = player.completedDungeons || {};
          player.completedQuests = player.completedQuests || [];
          inventory.potions = inventory.potions || { health: 0, resource: 0 };
          state.activeQuests = state.activeQuests || [];

          const classe = gameData.classes.find(c => c.id === player.classeId);
          if (!classe) return;

          const newStats: Stats = JSON.parse(JSON.stringify(player.baseStats));
          const equippedSetCounts: Record<string, number> = {};
          player.activeEffects = [];
          player.activeSetBonuses = [];

          Object.values(inventory.equipment).forEach(item => {
            if (item) {
              item.affixes.forEach(affix => {
                const statKey = affix.ref as keyof Stats;
                if (statKey in newStats && typeof newStats[statKey] !== 'object') {
                    (newStats[statKey] as number) = (newStats[statKey] || 0) + (affix.val || 0);
                }
              });
              if (item.effect) {
                player.activeEffects.push(item.effect);
              }
              if (item.set) {
                equippedSetCounts[item.set.id] = (equippedSetCounts[item.set.id] || 0) + 1;
              }
            }
          });

          Object.entries(equippedSetCounts).forEach(([setId, count]) => {
              const setInfo = gameData.sets.find(s => s.id === setId);
              if (setInfo) {
                  Object.entries(setInfo.bonuses).forEach(([bonusCount, effect]) => {
                      if (count >= parseInt(bonusCount, 10)) {
                          player.activeSetBonuses.push(effect);
                      }
                  });
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
          
          const currentHp = player.stats.PV;
          if (state.view !== 'COMBAT' || currentHp <= 0 || currentHp > maxHp) {
            player.stats.PV = maxHp;
            if(state.player.resources.type !== 'Rage') {
              player.resources.current = player.resources.max;
            }
          }
        });
      },

      equipItem: (itemId: string) => {
        const { inventory } = get();
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const itemToEquip = inventory.items[itemIndex];

        set((state: GameState) => {
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
        set((state: GameState) => {
            const item = state.inventory.equipment[slot];
            if (item) {
                state.inventory.items.push(item);
                state.inventory.equipment[slot] = null;
            }
        });
        get().recalculateStats();
      },

      buyItem: (item: Item) => {
          const { inventory } = get();
          const price = item.vendorPrice || 0;
          if (price <= 0 || inventory.gold < price) {
              return false;
          }

          const newItem: Item = JSON.parse(JSON.stringify(item));
          newItem.id = uuidv4();
          delete newItem.vendorPrice;

          set((state: GameState) => {
              state.inventory.gold -= price;
              state.inventory.items.push(newItem);
          });
          return true;
      },

      sellItem: (itemId: string) => {
        set((state: GameState) => {
            const itemIndex = state.inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return;

            const itemToSell = state.inventory.items[itemIndex];
            const sellPrice = getItemSellPrice(itemToSell);

            state.inventory.gold += sellPrice;
            state.inventory.items.splice(itemIndex, 1);
        });
      },

      sellAllUnusedItems: () => {
        let soldCount = 0;
        let goldGained = 0;
        set((state: GameState) => {
            const itemsToSell = [...state.inventory.items];
            state.inventory.items = [];

            itemsToSell.forEach(item => {
                goldGained += getItemSellPrice(item);
                soldCount++;
            });
            state.inventory.gold += goldGained;
        });
        return { soldCount, goldGained };
      },

      learnSkill: (skillId: string) => {
        set((state: GameState) => {
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
        set((state: GameState) => {
          const { player, gameData } = state;
          const talent = gameData.talents.find(t => t.id === talentId);
          if (!talent || player.talentPoints <= 0) return;

          const currentRank = player.learnedTalents[talentId] || 0;
          if (currentRank >= talent.rangMax) return;

          let canLearn = true;
          if (talent.exigences && talent.exigences.length > 0) {
            talent.exigences.forEach(req => {
              const [reqId, reqRankStr] = req.split(':');
              const reqRank = parseInt(reqRankStr, 10);
              const hasReq = (player.learnedTalents[reqId] || 0) >= reqRank;
              if (!hasReq) {
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
        set((state: GameState) => {
            if (slot < 0 || slot >= state.player.equippedSkills.length) return;

            const existingSlot = state.player.equippedSkills.indexOf(skillId);
            if (existingSlot !== -1) {
                state.player.equippedSkills[existingSlot] = null;
            }

            state.player.equippedSkills[slot] = skillId;
        });
      },

      unequipSkill: (slot: number) => {
        set((state: GameState) => {
            if (slot < 0 || slot >= state.player.equippedSkills.length) return;
            state.player.equippedSkills[slot] = null;
        });
      },

      resetGame: () => {
        useGameStore.persist.clearStorage();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      },

      buyPotion: (potionType: PotionType) => {
          const POTION_COST = potionType === 'health' ? 50 : 75;
          const { inventory } = get();
          if (inventory.gold < POTION_COST) {
              return false;
          }
          set((state: GameState) => {
              state.inventory.gold -= POTION_COST;
              state.inventory.potions[potionType]++;
          });
          return true;
      },

      rest: () => {
          const REST_COST = 25;
          const { inventory } = get();
          if (inventory.gold < REST_COST) {
              return false;
          }
          set((state: GameState) => {
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

      usePotion: (potionType: PotionType) => {
          set((state: GameState) => {
              if (potionType === 'health') {
                 if (state.inventory.potions.health > 0) {
                    const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    const healAmount = Math.round(maxHp * 0.15);
                    state.player.stats.PV = Math.min(maxHp, state.player.stats.PV + healAmount);
                    state.inventory.potions.health--;
                    state.combat.log.push({ message: `You use a potion and heal for ${healAmount} HP.`, type: 'heal', timestamp: Date.now() });
                }
              } else if (potionType === 'resource') {
                  if (state.inventory.potions.resource > 0) {
                      const resourceAmount = Math.round(state.player.resources.max * 0.25);
                      state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + resourceAmount);
                      state.inventory.potions.resource--;
                      state.combat.log.push({ message: `You use a potion and restore ${resourceAmount} ${state.player.resources.type}.`, type: 'heal', timestamp: Date.now() });
                  }
              }
          });
      },

      acceptQuest: (questId: string) => {
        set((state: GameState) => {
            const questToAccept = state.gameData.quests.find(q => q.id === questId);
            if (!questToAccept) return;

            if (state.activeQuests.some(q => q.quete.id === questId) || state.player.completedQuests.includes(questId)) {
                return;
            }
            
            const newActiveQuest: ActiveQuete = { quete: questToAccept, progress: 0 };
            if (questToAccept.type === 'defi' && questToAccept.requirements.timeLimit) {
                newActiveQuest.startTime = Date.now();
            }

            state.activeQuests.push(newActiveQuest);
        });
      },

      enterDungeon: (dungeonId: string) => {
        const { gameData, player, activeQuests } = get();

        const availableQuestsForDungeon = gameData.quests.filter(q =>
            q.requirements.dungeonId === dungeonId &&
            !player.completedQuests.includes(q.id) &&
            !activeQuests.some(aq => aq.quete.id === q.id)
        );
        
        const firstAvailableQuest = availableQuestsForDungeon.find(q => {
            const questIdParts = q.id.split('_q');
            if (questIdParts.length < 2 || isNaN(parseInt(questIdParts[1], 10))) {
              if (q.id.includes('_q_boss')) {
                  const questPrefix = q.id.substring(0, q.id.indexOf('_q_boss'));
                  const lastNumberedQuestId = `${questPrefix}_q5`;
                  return player.completedQuests.includes(lastNumberedQuestId);
              }
              return true;
            }
            const questNum = parseInt(questIdParts[1], 10);
            if (questNum === 1) return true;
            const questPrefix = questIdParts[0];
            const prevQuestId = `${questPrefix}_q${questNum - 1}`;
            return player.completedQuests.includes(prevQuestId);
        });

        if (firstAvailableQuest) {
            get().setProposedQuest(firstAvailableQuest);
            return;
        }

        const dungeon = gameData.dungeons.find(d => d.id === dungeonId);
        if (dungeon) {
          set((state: GameState) => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.dungeonStartTime = Date.now();
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

        const possibleMonsters = gameData.monsters.filter(m => currentDungeon.monsters.includes(m.id) && !m.isBoss);
        const monsterCount = Math.floor(Math.random() * 3) + 1;
        const newEnemies: CombatEnemy[] = [];

        for(let i=0; i<monsterCount; i++) {
          const randomMonsterTemplate = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
          if (randomMonsterTemplate) {
            const monsterInstance: CombatEnemy = {
              ...JSON.parse(JSON.stringify(randomMonsterTemplate)),
              id: uuidv4(),
              initialHp: randomMonsterTemplate.stats.PV,
              attackProgress: Math.random()
            };
            newEnemies.push(monsterInstance);
          }
        }

        if (newEnemies.length > 0) {
            set((state: GameState) => {
              state.combat.enemies = newEnemies;
              state.combat.playerAttackProgress = 0;
              state.combat.playerAttackInterval = state.player.stats.Vitesse * 1000;
              state.combat.log.push({ message: `A group of ${newEnemies.map(e => e.nom).join(', ')} appears!`, type: 'info', timestamp: Date.now() });
              state.combat.targetIndex = 0;
            });
        }
      },

      gameTick: (delta: number) => {
          const { view, combat } = get();

          if(view !== 'COMBAT' || !combat.enemies || combat.enemies.length === 0) {
            if(gameLoop) clearInterval(gameLoop);
            return;
          }

          set((state: GameState) => {
              const livingEnemies = state.combat.enemies.filter(e => e.stats.PV > 0);
              if (livingEnemies.length === 0) {
                  state.combat.playerAttackProgress = 0;
                  return;
              }

              if (state.combat.autoAttack) {
                  state.combat.playerAttackProgress += delta / state.combat.playerAttackInterval;
                  if (state.combat.playerAttackProgress > 1) {
                      state.combat.playerAttackProgress = 1;
                  }
              }

              if (state.player.resources.type === 'Énergie') {
                  const energyPerSecond = 20;
                  state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + (energyPerSecond * (delta / 1000)));
              } else if (state.player.resources.type === 'Mana') {
                  const manaPerSecond = 10;
                  state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + (manaPerSecond * (delta / 1000)));
              }

              for (const skillId in state.combat.skillCooldowns) {
                  state.combat.skillCooldowns[skillId] -= delta;
                  if (state.combat.skillCooldowns[skillId] <= 0) {
                      delete state.combat.skillCooldowns[skillId];
                  }
              }

              state.combat.enemies.forEach(enemy => {
                  if(enemy.stats.PV > 0) {
                    const attackInterval = enemy.stats.Vitesse * 1000;
                    if (enemy.attackProgress < 1) {
                        enemy.attackProgress += delta / attackInterval;
                    } else {
                        enemy.attackProgress = 1;
                    }
                  }
              });
          });

          const updatedState = get();
          if (updatedState.combat.autoAttack && updatedState.combat.playerAttackProgress >= 1 && updatedState.combat.enemies.some(e => e.stats.PV > 0)) {
              const target = updatedState.combat.enemies[updatedState.combat.targetIndex];
              if(target && target.stats.PV > 0) {
                get().playerAttack(target.id);
              } else {
                get().cycleTarget();
              }
          }

          if (updatedState.combat.enemies.some(e => e.attackProgress >= 1)) {
              get().enemyAttacks();
          }
      },

      playerAttack: (targetId: string, isCleave = false, skillId?: string) => {
        set((state: GameState) => {
            const { player, combat } = state;
            const target = combat.enemies.find(e => e.id === targetId);
            if (!target || target.stats.PV <= 0) return;

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
                state.combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                state.combat.playerAttackProgress = 0;
            } else {
                  state.combat.log.push({ message: `Your cleave hits ${target.nom} for ${mitigatedDamage} damage.`, type: 'player_attack', timestamp: Date.now() });
            }

            if(state.player.resources.type === 'Rage' && !isCleave) {
              let rageGained = 5;
              const criDeGuerreRank = state.player.learnedTalents['berserker_battle_cry'] || 0;
              if (criDeGuerreRank > 0) {
                  const talent = state.gameData.talents.find(t => t.id === 'berserker_battle_cry');
                  if(talent) {
                    rageGained += getTalentEffectValue(talent.effets[0], criDeGuerreRank);
                  }
              }
              state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + rageGained);
            }
        });

        const target = get().combat.enemies.find(e => e.id === targetId);
        if (target && target.stats.PV <= 0) {
            get().handleEnemyDeath(target, skillId);
        } else {
            const { player } = get();
            const cleaveRank = player.learnedTalents['berserker_cleave'] || 0;
            const enemies = get().combat.enemies;
            if (!isCleave && cleaveRank > 0 && enemies.length > 1) {
                const secondaryTarget = enemies.find(e => e.id !== targetId && e.stats.PV > 0);
                if (secondaryTarget) {
                    get().playerAttack(secondaryTarget.id, true);
                }
            }
        }
      },

      useSkill: (skillId: string) => {
        const deadEnemyIds: string[] = [];

        set((state: GameState) => {
            const { player, combat, gameData } = state;
            if (!combat.enemies || combat.enemies.length === 0 || (combat.skillCooldowns[skillId] || 0) > 0) {
                return;
            }

            const rank = player.learnedSkills[skillId];
            const skill = gameData.skills.find(t => t.id === skillId);
            if (!skill || !rank) return;

            const resourceCostMatch = skill.effets.join(' ').match(/Coûte (\d+) (Rage|Mana|Énergie)/);
            const resourceCost = resourceCostMatch ? parseInt(resourceCostMatch[1], 10) : 0;

            if (player.resources.current < resourceCost) {
                combat.log.push({ message: "Pas assez de ressource!", type: 'info', timestamp: Date.now() });
                return;
            }
            player.resources.current -= resourceCost;
            combat.skillCooldowns[skillId] = (skill.cooldown || 0) * 1000;

            state.combat.playerAttackProgress = 0;

            const isAoE = skill.effets.join(' ').includes("tous les ennemis") || skill.effets.join(' ').includes("ennemis proches");
            const primaryTarget = combat.enemies[combat.targetIndex];
            const targets = isAoE ? [...combat.enemies.filter(e => e.stats.PV > 0)] : (primaryTarget && primaryTarget.stats.PV > 0 ? [primaryTarget] : []);

            if (targets.length === 0) return;

            targets.forEach(target => {
                const currentTarget = combat.enemies.find(e => e.id === target.id);
                if (!currentTarget) return;

                let damage = 0;
                if (skill.classeId === 'berserker' || skill.classeId === 'rogue') {
                    const dmgMultiplierMatch = skill.effets.join(' ').match(/(\d+)% des dégâts de l'arme/);
                    const dmgMultiplier = dmgMultiplierMatch ? parseInt(dmgMultiplierMatch[1], 10) / 100 : 1;
                    const baseDmg = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
                    damage = baseDmg * dmgMultiplier;
                } else if (skill.classeId === 'mage' || skill.classeId === 'cleric') {
                    const baseDmg = getTalentEffectValue(skill.effets[0], rank);
                    damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(player.stats));
                }
                 if(skill.id === 'berserker_execute') {
                    const hpPercent = (currentTarget.stats.PV / currentTarget.initialHp) * 100;
                    if(hpPercent < 20) {
                        damage *= 3;
                    }
                }

                const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, currentTarget.stats.Esquive);
                let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
                const dr = formulas.calculateArmorDR(currentTarget.stats.Armure, player.level);
                const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                const msg = `You use ${skill.nom} on ${currentTarget.nom} for ${mitigatedDamage} damage.`;
                const critMsg = `CRITICAL! Your ${skill.nom} hits ${currentTarget.nom} for ${mitigatedDamage} damage.`;

                currentTarget.stats.PV -= mitigatedDamage;
                combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });

                if (currentTarget.stats.PV <= 0) {
                    deadEnemyIds.push(currentTarget.id);
                }
            });
        });

        deadEnemyIds.forEach(enemyId => {
            const enemy = get().combat.enemies.find(e => e.id === enemyId);
            if (enemy) {
                get().handleEnemyDeath(enemy, skillId);
            }
        });
      },

      enemyAttacks: () => {
        const attackingEnemies = get().combat.enemies.filter(e => e.attackProgress >= 1 && e.stats.PV > 0);

        attackingEnemies.forEach(enemy => {
            const { player } = get();
            if (player.stats.PV <= 0) return;

            set((state: GameState) => {
                const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                if (!enemyInState || enemyInState.stats.PV <= 0) return;

                const playerDr = formulas.calculateArmorDR(state.player.stats.Armure, enemy.level);
                const enemyDamage = formulas.calculateMeleeDamage(enemy.stats.AttMin, enemy.stats.AttMax, formulas.calculateAttackPower(enemy.stats));
                const mitigatedEnemyDamage = Math.round(enemyDamage * (1 - playerDr));

                state.player.stats.PV -= mitigatedEnemyDamage;
                state.combat.log.push({ message: `${enemy.nom} hits you for ${mitigatedEnemyDamage} damage.`, type: 'enemy_attack', timestamp: Date.now() });

                if (state.player.resources.type === 'Rage') {
                  const rageGained = 10;
                  state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + rageGained);
                }

                enemyInState.attackProgress = 0;
            });
        });

        if (get().player.stats.PV <= 0) {
            set((state: GameState) => {
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

      handleEnemyDeath: (enemy: CombatEnemy, skillId?: string) => {
        if (!enemy) {
            console.error("handleEnemyDeath called with undefined enemy");
            return;
        }
        set((state: GameState) => {
            if (!state.combat.enemies.some(e => e && e.id === enemy.id)) return;
             const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
             if (enemyInState) {
                enemyInState.attackProgress = 0;
             }
        });

        set((state: GameState) => {
            const { gameData, currentDungeon, activeQuests } = state;

            const goldDrop = 5;
            const itemDrop = resolveLoot(enemy, gameData, state.player.classeId, activeQuests);
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

            if (!enemy.isBoss) {
              state.combat.killCount += 1;
            }

            if (state.combat.targetIndex === state.combat.enemies.findIndex(e => e.id === enemy.id)) {
                const nextTargetIndex = state.combat.enemies.findIndex(e => e.stats.PV > 0);
                state.combat.targetIndex = nextTargetIndex !== -1 ? nextTargetIndex : 0;
            }

            state.activeQuests.forEach((activeQuest) => {
              const { quete } = activeQuest;
              const req = quete.requirements;
              let progressMade = false;
      
              if (quete.type === 'chasse' && req.dungeonId === currentDungeon?.id && !enemy.isBoss) {
                  activeQuest.progress++;
                  progressMade = true;
              } else if (quete.type === 'chasse_boss' && enemy.isBoss && enemy.id.startsWith(req.bossId || '')) {
                  activeQuest.progress++;
                  progressMade = true;
              } else if (quete.type === 'collecte' && req.dungeonId === currentDungeon?.id) {
                  if (Math.random() < 0.3) {
                      activeQuest.progress++;
                      progressMade = true;
                      state.combat.log.push({ message: `Vous avez récupéré: ${req.itemId} (${activeQuest.progress}/${req.itemCount})`, type: 'quest', timestamp: Date.now() });
                  }
              } else if (quete.type === 'defi' && req.dungeonId === currentDungeon?.id && req.skillId && req.monsterType) {
                  if (skillId === req.skillId && enemy.famille === req.monsterType) {
                      activeQuest.progress++;
                      progressMade = true;
                  }
              }
      
              const target = req.killCount || req.itemCount || (req.bossId ? 1 : 0);
              if (progressMade && target > 0 && activeQuest.progress >= target) {
                  state.combat.log.push({ message: `Quête terminée: ${quete.name}!`, type: 'quest', timestamp: Date.now() });
                  state.inventory.gold += quete.rewards.gold;
                  state.player.xp += quete.rewards.xp;
                  state.combat.log.push({ message: `Vous avez reçu ${quete.rewards.gold} or et ${quete.rewards.xp} XP.`, type: 'loot', timestamp: Date.now() });
      
                  state.player.completedQuests.push(quete.id);
                  const activeQuestIndex = state.activeQuests.findIndex(aq => aq.quete.id === quete.id);
                  if (activeQuestIndex !== -1) {
                      state.activeQuests.splice(activeQuestIndex, 1);
                  }
      
                  if (quete.rewards.reputation) {
                      const rep = quete.rewards.reputation;
                      const repData = state.player.reputation[rep.factionId] || { value: 0, claimedRewards: [] };
                      repData.value += rep.amount;
                      state.player.reputation[rep.factionId] = repData;
                      state.combat.log.push({ message: `Votre réputation avec ${gameData.factions.find(f => f.id === rep.factionId)?.name || 'une faction'} a augmenté de ${rep.amount}.`, type: 'info', timestamp: Date.now() });
                  }
              }
          });

            let leveledUp = false;
            let xpToNext = get().getXpToNextLevel();
            while(state.player.xp >= xpToNext) {
                state.player.level += 1;
                state.player.talentPoints += 2;
                leveledUp = true;
                 state.player.xp -= xpToNext;
                state.combat.log.push({ message: `Congratulations! You have reached level ${state.player.level}!`, type: 'levelup', timestamp: Date.now() });
                xpToNext = get().getXpToNextLevel();
            }

            if (leveledUp) {
                get().recalculateStats();
            }
        });

        const allEnemiesDead = get().combat.enemies.every(e => e.stats.PV <= 0);
        const currentDungeon = get().currentDungeon;

        if (allEnemiesDead) {
             setTimeout(() => {
                const { gameData } = get();
                if (currentDungeon) {
                    const bossHasBeenDefeated = get().combat.enemies.some(e => e.isBoss && e.stats.PV <= 0);

                    if (bossHasBeenDefeated) {
                        set((state: GameState) => {
                            state.player.completedDungeons[currentDungeon.id] = (state.player.completedDungeons[currentDungeon.id] || 0) + 1;
                            const dungeonDuration = (Date.now() - (state.dungeonStartTime || Date.now())) / 1000;

                            state.activeQuests.forEach((activeQuest) => {
                              const { quete } = activeQuest;
                              if (quete.type === 'nettoyage' && quete.requirements.dungeonId === currentDungeon.id) {
                                activeQuest.progress = state.player.completedDungeons[currentDungeon.id];
                              } else if (quete.type === 'defi' && quete.requirements.timeLimit && dungeonDuration <= quete.requirements.timeLimit) {
                                activeQuest.progress = 1;
                              }

                              const target = quete.requirements.clearCount || (quete.requirements.timeLimit ? 1 : 0);
                              if (target > 0 && activeQuest.progress >= target) {
                                state.combat.log.push({ message: `Quête terminée: ${quete.name}!`, type: 'quest', timestamp: Date.now() });
                                state.inventory.gold += quete.rewards.gold;
                                state.player.xp += quete.rewards.xp;
                                state.combat.log.push({ message: `Vous avez reçu ${quete.rewards.gold} or et ${quete.rewards.xp} XP.`, type: 'loot', timestamp: Date.now() });
                                state.player.completedQuests.push(quete.id);
                              }
                            });

                            state.activeQuests = state.activeQuests.filter(aq => !state.player.completedQuests.includes(aq.quete.id));

                            if (currentDungeon.factionId) {
                                const repData = state.player.reputation[currentDungeon.factionId] || { value: 0, claimedRewards: [] };
                                repData.value += 250;
                                state.player.reputation[currentDungeon.factionId] = repData;
                            }

                            state.inventory.items.push(...state.combat.dungeonRunItems);
                            state.combat.dungeonRunItems = [];
                            state.combat.log.push({ message: `Dungeon complete! Returning to town.`, type: 'info', timestamp: Date.now() });
                            state.view = 'TOWN';
                            state.dungeonStartTime = null;

                            const faction = state.gameData.factions.find(f => f.id === currentDungeon.factionId);
                            if (faction && state.player.reputation[faction.id]) {
                                const playerRep = state.player.reputation[faction.id];
                                faction.ranks.forEach(rank => {
                                    if (rank.rewardItemId && playerRep.value >= rank.threshold && !playerRep.claimedRewards.includes(rank.rewardItemId)) {
                                        const rewardItem = state.gameData.items.find(i => i.id === rank.rewardItemId);
                                        if (rewardItem) {
                                            state.inventory.items.push({ ...rewardItem, id: uuidv4() });
                                            playerRep.claimedRewards.push(rank.rewardItemId);
                                            console.log(`You have been awarded ${rewardItem.name} for reaching ${rank.name} with ${faction.name}.`);
                                        }
                                    }
                                });
                            }
                        });
                        if(gameLoop) clearInterval(gameLoop);
                    } else if (get().combat.killCount >= currentDungeon.killTarget) {
                        const bossTemplate = gameData.monsters.find(m => m.id === currentDungeon.bossId);
                        if (bossTemplate) {
                            const bossInstance: CombatEnemy = {
                                ...JSON.parse(JSON.stringify(bossTemplate)),
                                // id: uuidv4(), // CORRECTION: Ligne supprimée pour corriger le bug de la quête
                                initialHp: bossTemplate.stats.PV,
                                attackProgress: 0,
                                isBoss: true
                            };
                            
                            // NOUVEAU: Déclencher l'état de rencontre avec le boss
                            get().setBossEncounter(bossTemplate);

                            set((state: GameState) => {
                                state.combat.enemies = [bossInstance];
                                state.combat.targetIndex = 0;
                                state.combat.log.push({ message: `Le boss, ${bossTemplate.nom}, apparaît !`, type: 'info', timestamp: Date.now() });
                            });
                        }
                    } else {
                        get().startCombat();
                    }
                }
            }, 1000);
        }
      },

      cycleTarget: () => {
        set((state: GameState) => {
            const livingEnemies = state.combat.enemies.filter(e => e.stats.PV > 0);
            if (livingEnemies.length > 1) {
                const currentTargetId = state.combat.enemies[state.combat.targetIndex].id;
                const currentTargetIndexInLiving = livingEnemies.findIndex(e => e.id === currentTargetId);
                const nextLivingIndex = (currentTargetIndexInLiving + 1) % livingEnemies.length;
                const newTargetId = livingEnemies[nextLivingIndex].id;
                const newTargetIndexInAll = state.combat.enemies.findIndex(e => e.id === newTargetId);

                state.combat.targetIndex = newTargetIndexInAll;
                state.combat.log.push({ message: `You are now targeting ${state.combat.enemies[newTargetIndexInAll].nom}.`, type: 'info', timestamp: Date.now() });
            }
        });
      },

      flee: () => {
        set((state: GameState) => {
            state.view = 'TOWN';
            state.dungeonStartTime = null;
            state.combat.enemies = [];
            state.inventory.items.push(...state.combat.dungeonRunItems);
            state.combat.dungeonRunItems = [];
            state.combat.log.push({ message: 'You fled from combat. Items found have been kept.', type: 'flee', timestamp: Date.now() });
        });
        if(gameLoop) clearInterval(gameLoop);
      },

      toggleAutoAttack: () => {
        set((state: GameState) => {
          state.combat.autoAttack = !state.combat.autoAttack;
        });
      },

    })),
    {
      name: 'barquest-save',
      storage: storage,
      onRehydrateStorage: () => (state: GameState | undefined) => {
        if (state) {
            state.rehydrateComplete = true;
            state.view = 'TOWN';
            state.combat = initialCombatState;
            state.player.learnedTalents = state.player.learnedTalents || {};
            state.player.reputation = state.player.reputation || {};
            state.player.completedQuests = Array.isArray(state.player.completedQuests) ? state.player.completedQuests : [];
            state.activeQuests = Array.isArray(state.activeQuests) ? state.activeQuests : [];
            state.player.completedDungeons = (state.player.completedDungeons && typeof state.player.completedDungeons === 'object' && !Array.isArray(state.player.completedDungeons)) ? state.player.completedDungeons : {};

            if(typeof state.inventory.potions !== 'object' || state.inventory.potions === null) {
              state.inventory.potions = { health: 0, resource: 0};
            }
        }
      }
    }
  )
);
