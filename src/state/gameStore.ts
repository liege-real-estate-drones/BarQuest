import create from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Skill, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Quete, PlayerClassId, ResourceType, Rareté, CombatEnemy, ItemSet, PotionType, Recipe } from '@/lib/types';
import * as formulas from '@/core/formulas';
import { generateProceduralItem } from '@/core/itemGenerator';
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
    activeBuffs: [],
    activeSetBonuses: [],
    completedDungeons: {},
    completedQuests: [],
    shield: 0,
  };
};

const initialInventoryState: InventoryState = {
  gold: 100,
  items: [],
  craftingMaterials: {},
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
  pendingActions: [],
  isStealthed: false,
};

interface GameState {
  isInitialized: boolean;
  rehydrateComplete: boolean;
  lastPlayed: number | null;
  view: 'MAIN' | 'COMBAT' | 'DUNGEON_COMPLETED';
  townView: 'TOWN' | 'CRAFTING';
  worldTier: number;
  currentDungeon: Dungeon | null;
  dungeonStartTime: number | null;
  dungeonCompletionSummary: DungeonCompletionSummary | null;
  gameData: GameData;
  player: PlayerState;
  inventory: InventoryState;
  combat: CombatState;
  activeQuests: ActiveQuete[];
  proposedQuests: Quete[] | null;
  bossEncounter: Monstre | null; // NOUVEAU: Pour l'alerte d'apparition du boss
  isHeroicMode: boolean;

  craftItem: (recipeId: string) => void;
  setHeroicMode: (isHeroic: boolean) => void;
  setTownView: (view: 'TOWN' | 'CRAFTING') => void;
  setWorldTier: (tier: number) => void;
  setBossEncounter: (monster: Monstre | null) => void; // NOUVEAU: Action pour gérer l'alerte
  setProposedQuests: (quests: Quete[] | null) => void;
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
  acceptMultipleQuests: (questIds: string[]) => void;

  endDungeon: () => void;
  closeDungeonSummary: () => void;
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
      applySpecialEffect: (trigger: string, context: { targetId: string, isCrit: boolean }) => void;
  dismantleItem: (itemId: string) => void;
  enchantItem: (itemId: string) => void;
  gambleForItem: (itemSlot: string) => void;
}

let gameLoop: NodeJS.Timeout | null = null;

const rarityDropChances: Record<Rareté, number> = {
  Commun: 0.7,
  Rare: 0.25,
  Épique: 0.04,
  Légendaire: 0.01,
  Unique: 0.0,
};

const resolveLoot = (monster: Monstre, gameData: GameData, playerClassId: PlayerClassId | null, activeQuests: ActiveQuete[], worldTier: number): Item | null => {
  // --- 1. Boss Specific Loot ---
  if (monster.isBoss && monster.specificLootTable && Math.random() < 0.1) { // 10% chance for a specific drop
    const specificLootId = monster.specificLootTable[Math.floor(Math.random() * monster.specificLootTable.length)];
    const specificItem = gameData.items.find(item => item.id === specificLootId);
    if (specificItem) {
      return { ...specificItem, id: uuidv4() };
    }
  }

  // --- 2. Quest Item Check ---
  for (const activeQuest of activeQuests) {
    const { quete } = activeQuest;
    if (quete.type === 'collecte' && quete.requirements.itemId && monster.questItemId === quete.requirements.itemId) {
      if ((activeQuest.progress || 0) < (quete.requirements.itemCount || 0)) {
        const questItem = gameData.items.find(item => item.id === quete.requirements.itemId);
        if (questItem && Math.random() < 0.3) { // 30% drop chance for quest items
          return { ...questItem, id: uuidv4() };
        }
      }
    }
  }

  // --- 2. Determine Rarity ---
  if (Math.random() > 0.5) { // 50% chance of no loot at all
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

  // --- 3. Handle Legendary and Unique Items ---
  if (chosenRarity === "Légendaire" || chosenRarity === "Unique") {
    const possibleItems = gameData.items.filter(item =>
        item.rarity === chosenRarity &&
        (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
    );

    if (possibleItems.length > 0) {
        const droppedItem = { ...possibleItems[Math.floor(Math.random() * possibleItems.length)] };
        droppedItem.id = uuidv4();
        // Maybe scale legendary stats in the future? For now, return as is.
        return droppedItem;
    }
    // If no legendaries are found, fallback to generating an epic
    chosenRarity = "Épique";
  }


  // --- 4. Select a Base Item Template for Procedural Generation ---
  const possibleItemTemplates = gameData.items.filter(item =>
      // We are looking for non-legendary, non-unique, non-set items to serve as templates
      item.rarity !== "Légendaire" &&
      item.rarity !== "Unique" &&
      !item.set &&
      item.slot !== 'potion' &&
      (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
  );

  if (possibleItemTemplates.length === 0) {
    return null; // No suitable base items found
  }

  const baseItemTemplate = possibleItemTemplates[Math.floor(Math.random() * possibleItemTemplates.length)];

  // --- 5. Generate the Procedural Item ---
  // We pass a clean version of the template, without ID, level, rarity, or existing affixes
  const { id, niveauMin, rarity, affixes, ...baseItemProps } = baseItemTemplate;

  const itemLevel = monster.level + (worldTier - 1) * 5;

  const newItem = generateProceduralItem(
    baseItemProps,
    itemLevel,
    chosenRarity,
    gameData.affixes
  );

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
    if (!item || !classId) return 0;

    const weights = STAT_WEIGHTS[classId];

    (item.affixes || []).forEach(affix => {
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
      view: 'MAIN',
      townView: 'TOWN',
      worldTier: 1,
      currentDungeon: null,
      dungeonStartTime: null,
      dungeonCompletionSummary: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], skills: [], affixes: [], classes: [], quests: [], factions: [], sets: [], recipes: [] },
      player: getInitialPlayerState(),
      inventory: initialInventoryState,
      combat: initialCombatState,
      activeQuests: [],
      proposedQuests: null,
      bossEncounter: null, // NOUVEAU: Initialisation de l'état du boss
      isHeroicMode: false,

      setHeroicMode: (isHeroic: boolean) => {
        set({ isHeroicMode: isHeroic });
      },

      setTownView: (view) => {
        set({ townView: view });
      },

      setWorldTier: (tier) => {
        set({ worldTier: tier });
      },

      // NOUVEAU: Implémentation de l'action pour le boss
      setBossEncounter: (monster) => {
        set({ bossEncounter: monster });
      },

      setProposedQuests: (quests) => {
        set({ proposedQuests: quests });
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
            state.gameData.recipes = Array.isArray(data.recipes) ? data.recipes : [];
            state.isInitialized = true;
        });
      },

      craftItem: (recipeId: string) => {
        set((state: GameState) => {
          const recipe = state.gameData.recipes.find(r => r.id === recipeId);
          if (!recipe) {
            console.error(`Recipe ${recipeId} not found.`);
            return;
          }

          // 1. Check cost
          if (state.inventory.gold < recipe.cost) {
            console.log("Not enough gold.");
            // TODO: Add user feedback
            return;
          }

          // 2. Check materials
          for (const materialId in recipe.materials) {
            const requiredAmount = recipe.materials[materialId];
            const playerAmount = state.inventory.craftingMaterials[materialId] || 0;
            if (playerAmount < requiredAmount) {
              console.log(`Not enough ${materialId}.`);
              // TODO: Add user feedback
              return;
            }
          }

          // 3. Subtract cost and materials
          state.inventory.gold -= recipe.cost;
          for (const materialId in recipe.materials) {
            state.inventory.craftingMaterials[materialId] -= recipe.materials[materialId];
          }

          // 4. Create and add item
          const baseItem = state.gameData.items.find(i => i.id === recipe.result);
          if (!baseItem) {
            console.error(`Result item ${recipe.result} not found in game data.`);
            // TODO: Potentially refund materials/gold here
            return;
          }

          const newItem = { ...baseItem, id: uuidv4() };
          state.inventory.items.push(newItem);
          console.log(`Successfully crafted ${newItem.name}.`);
          // TODO: Add user feedback
        });
      },

      gambleForItem: (itemSlot) => {
        set((state: GameState) => {
            const cost = 100 * state.worldTier;
            if (state.inventory.gold < cost) {
                console.log("Not enough gold to gamble");
                return;
            }

            const possibleTemplates = state.gameData.items.filter(item => item.slot === itemSlot && item.rarity !== "Légendaire" && item.rarity !== "Unique");
            if (possibleTemplates.length === 0) {
                console.log("No items found for that slot");
                return;
            }

            state.inventory.gold -= cost;

            const baseItemTemplate = possibleTemplates[Math.floor(Math.random() * possibleTemplates.length)];

            // Determine rarity - low chance for high rarity
            const roll = Math.random();
            let rarity: Rareté = "Commun";
            if (roll < 0.01) rarity = "Légendaire";
            else if (roll < 0.05) rarity = "Épique";
            else if (roll < 0.25) rarity = "Rare";

            const itemLevel = state.player.level;
            const { id, niveauMin, affixes, ...baseItemProps } = baseItemTemplate;
            const newItem = generateProceduralItem(baseItemProps, itemLevel, rarity, state.gameData.affixes);

            state.inventory.items.push(newItem);
        });
      },

      dismantleItem: (itemId) => {
        set((state: GameState) => {
            const itemIndex = state.inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return;

            const itemToDismantle = state.inventory.items[itemIndex];
            state.inventory.items.splice(itemIndex, 1);

            // Simple dismantling logic: 1-3 generic materials based on rarity
            const rarityMultiplier = { "Commun": 1, "Rare": 2, "Épique": 3, "Légendaire": 5, "Unique": 5 };
            const amount = Math.ceil(Math.random() * rarityMultiplier[itemToDismantle.rarity]);

            const materialId = "scrap_metal"; // Generic material for now
            state.inventory.craftingMaterials[materialId] = (state.inventory.craftingMaterials[materialId] || 0) + amount;
        });
      },

      enchantItem: (itemId) => {
        set((state: GameState) => {
            const item = state.inventory.items.find(i => i.id === itemId);
            if (!item || !item.affixes || item.affixes.length === 0) return;

            // Cost to enchant: 5 scrap_metal
            const cost = 5;
            const materialId = "scrap_metal";
            if ((state.inventory.craftingMaterials[materialId] || 0) < cost) {
                console.log("Not enough materials to enchant");
                return;
            }

            state.inventory.craftingMaterials[materialId] -= cost;

            // Reroll one random affix
            const affixToRerollIndex = Math.floor(Math.random() * item.affixes.length);
            const affixToReroll = item.affixes[affixToRerollIndex];

            const affixTemplate = state.gameData.affixes.find(a => a.ref === affixToReroll.ref);
            if (!affixTemplate) return;

            const [min, max] = affixTemplate.portée;
            const baseValue = Math.floor(Math.random() * (max - min + 1)) + min;
            const scaledValue = Math.round(baseValue + (baseValue * item.niveauMin * 0.1) + (item.niveauMin * 0.5));

            item.affixes[affixToRerollIndex].val = scaledValue;
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
          player.activeBuffs = player.activeBuffs || [];
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
              if (item.affixes) {
                item.affixes.forEach(affix => {
                  const statKey = affix.ref as keyof Stats;
                  if (statKey in newStats && typeof newStats[statKey] !== 'object') {
                      (newStats[statKey] as number) = (newStats[statKey] || 0) + (affix.val || 0);
                  }
                });
              }
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
            player.shield = 0;
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

      acceptMultipleQuests: (questIds: string[]) => {
        set((state: GameState) => {
          const newQuestsToAdd = questIds
            .map(questId => {
              const questToAccept = state.gameData.quests.find(q => q.id === questId);
              if (!questToAccept || state.activeQuests.some(q => q.quete.id === questId) || state.player.completedQuests.includes(questId)) {
                return null;
              }
              const newActiveQuest: ActiveQuete = { quete: questToAccept, progress: 0 };
              if (questToAccept.type === 'defi' && questToAccept.requirements.timeLimit) {
                  newActiveQuest.startTime = Date.now();
              }
              return newActiveQuest;
            })
            .filter((q): q is ActiveQuete => q !== null);

          state.activeQuests.push(...newQuestsToAdd);
        });
      },

      closeDungeonSummary: () => {
        set((state: GameState) => {
          state.dungeonCompletionSummary = null;
          state.view = 'MAIN';
        });
      },

      endDungeon: () => {
        set((state: GameState) => {
          const { combat, player, inventory, gameData, currentDungeon, worldTier } = state;

          // --- Surprise Feature: Bonus Loot Roll ---
          let bonusItem: Item | null = null;
          if (Math.random() < 0.2) { // 20% chance for a bonus item
            const possibleItemTemplates = gameData.items.filter(item =>
              item.rarity !== "Légendaire" && item.rarity !== "Unique" && !item.set && item.slot !== 'potion' &&
              (item.tagsClasse?.includes('common') || (player.classeId && item.tagsClasse?.includes(player.classeId)))
            );
            if (possibleItemTemplates.length > 0) {
              const baseItemTemplate = possibleItemTemplates[Math.floor(Math.random() * possibleItemTemplates.length)];
              const { id, niveauMin, rarity, affixes, ...baseItemProps } = baseItemTemplate;
              const itemLevel = currentDungeon?.palier ?? player.level;
              // Give a higher chance for a good rarity on the bonus item
              const roll = Math.random();
              let bonusRarity: Rareté = "Rare";
              if (roll < 0.1) bonusRarity = "Légendaire";
              else if (roll < 0.3) bonusRarity = "Épique";

              bonusItem = generateProceduralItem(baseItemProps, itemLevel, bonusRarity, gameData.affixes);
            }
          }

          // Finalize rewards
          const summary: DungeonCompletionSummary = {
            gold: combat.goldGained,
            experience: combat.xpGained,
            items: combat.dungeonRunItems,
            bonusItem: bonusItem,
          };

          state.dungeonCompletionSummary = summary;

          // Add rewards to player inventory
          inventory.gold += summary.gold;
          player.xp += summary.experience;
          inventory.items.push(...summary.items);
          if (summary.bonusItem) {
            inventory.items.push(summary.bonusItem);
          }

          // Handle quests and other end-of-dungeon logic
          if (currentDungeon) {
            player.completedDungeons[currentDungeon.id] = (player.completedDungeons[currentDungeon.id] || 0) + 1;
            if (currentDungeon.factionId) {
                const repData = player.reputation[currentDungeon.factionId] || { value: 0, claimedRewards: [] };
                repData.value += 250;
                player.reputation[currentDungeon.factionId] = repData;
            }
          }

          // Reset combat state and switch view
          state.combat.dungeonRunItems = [];
          state.combat.goldGained = 0;
          state.combat.xpGained = 0;
          state.dungeonStartTime = null;
          state.view = 'DUNGEON_COMPLETED';
          if (gameLoop) clearInterval(gameLoop);
        });
      },

      enterDungeon: (dungeonId: string) => {
        const { gameData, isHeroicMode } = get();
        const finalDungeonId = isHeroicMode ? `${dungeonId}_heroic` : dungeonId;
        const dungeon = gameData.dungeons.find(d => d.id === finalDungeonId);

        if (dungeon) {
          set((state: GameState) => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.dungeonStartTime = Date.now();
            state.combat = { ...initialCombatState, goldGained: 0, xpGained: 0, pendingActions: [], log: [{ message: `Entered ${dungeon.name}.`, type: 'info', timestamp: Date.now() }]};
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
        const { currentDungeon, gameData, worldTier } = get();
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
              templateId: randomMonsterTemplate.id,
              initialHp: randomMonsterTemplate.stats.PV,
              attackProgress: Math.random(),
              activeDebuffs: [],
            };

            // Apply world tier scaling
            const scalingFactor = 1 + (worldTier - 1) * 0.25; // +25% stats per tier
            Object.keys(monsterInstance.stats).forEach(key => {
                const statKey = key as keyof Stats;
                if (typeof monsterInstance.stats[statKey] === 'number') {
                    (monsterInstance.stats[statKey] as number) *= scalingFactor;
                }
            });
            monsterInstance.initialHp = monsterInstance.stats.PV;

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

              const stealthExpired = state.player.activeBuffs.some(b => b.id === 'stealth' && b.duration <= delta);

              state.player.activeBuffs = state.player.activeBuffs.filter(buff => {
                  buff.duration -= delta;
                  if (buff.duration <= 0) return false;

                  if (buff.healingPerTick && buff.nextTickIn !== undefined && buff.tickInterval !== undefined) {
                      buff.nextTickIn -= delta;
                      if (buff.nextTickIn <= 0) {
                          const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                          const oldHp = state.player.stats.PV;
                          state.player.stats.PV = Math.min(maxHp, state.player.stats.PV + buff.healingPerTick);
                          const actualHeal = Math.round(state.player.stats.PV - oldHp);
                          if (actualHeal > 0) {
                              state.combat.log.push({ message: `Votre soin sur la durée vous rend ${actualHeal} PV.`, type: 'heal', timestamp: Date.now() });
                          }
                          buff.nextTickIn = buff.tickInterval;
                      }
                  }
                  return true;
              });

              if (stealthExpired && state.combat.isStealthed) {
                state.combat.isStealthed = false;
                state.combat.log.push({ message: "Votre camouflage s'est estompé.", type: 'info', timestamp: Date.now() });
              }

              state.combat.enemies.forEach(enemy => {
                  if(enemy.stats.PV > 0) {
                    const attackInterval = enemy.stats.Vitesse * 1000;
                    if (enemy.attackProgress < 1) {
                        enemy.attackProgress += delta / attackInterval;
                    } else {
                        enemy.attackProgress = 1;
                    }

                    enemy.activeDebuffs = enemy.activeDebuffs?.filter(debuff => {
                        debuff.duration -= delta;
                        if (debuff.duration <= 0) return false;

                        debuff.nextTickIn -= delta;
                        if (debuff.nextTickIn <= 0) {
                            enemy.stats.PV -= debuff.damagePerTick;
                            state.combat.log.push({ message: `${enemy.nom} subit ${debuff.damagePerTick} dégâts de poison.`, type: 'enemy_attack', timestamp: Date.now() });
                            debuff.nextTickIn = debuff.tickInterval;
                            if (enemy.stats.PV <= 0) {
                                deadEnemyIdsFromActions.push(enemy.id);
                            }
                        }
                        return true;
                    }) || [];
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

          const deadEnemyIdsFromActions: string[] = [];
          set((state: GameState) => {
            state.combat.pendingActions = state.combat.pendingActions?.filter(action => {
                if (action.type === 'damage_wave') {
                    action.nextWaveIn -= delta;
                    if (action.nextWaveIn <= 0) {
                        const target = state.combat.enemies.find(e => e.id === action.targetId);
                        if (target && target.stats.PV > 0) {
                            const skill = state.gameData.skills.find(s => s.id === action.skillId);
                            const damage = formulas.calculateSpellDamage(action.damagePerWave, formulas.calculateSpellPower(state.player.stats));
                            const isCrit = formulas.isCriticalHit(state.player.stats.CritPct, state.player.stats.Precision, target.stats.Esquive);
                            const finalDamage = isCrit ? damage * (state.player.stats.CritDmg / 100) : damage;
                            const dr = formulas.calculateArmorDR(target.stats.Armure, state.player.level);
                            const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                            target.stats.PV -= mitigatedDamage;
                            const waveNum = getTalentEffectValue(skill!.effets[0], state.player.learnedSkills[skill!.id]) - action.wavesLeft + 1;
                            const msg = `Votre ${skill!.nom} (Vague ${waveNum}) inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`;
                            const critMsg = `CRITIQUE ! Votre ${skill!.nom} (Vague ${waveNum}) inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`;
                            state.combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });

                            if (target.stats.PV <= 0) {
                                deadEnemyIdsFromActions.push(target.id);
                            }
                        }
                        action.wavesLeft--;
                        action.nextWaveIn = action.interval;
                    }
                }
                return action.wavesLeft > 0;
            }) || [];
          });

          deadEnemyIdsFromActions.forEach(id => {
            const enemy = get().combat.enemies.find(e => e.id === id);
            if(enemy) get().handleEnemyDeath(enemy);
          });
      },

      playerAttack: (targetId: string, isCleave = false, skillId?: string) => {
        set((state: GameState) => {
            const { player, combat } = state;
            if (combat.isStealthed) {
                combat.isStealthed = false;
                combat.log.push({ message: "Vous sortez de l'ombre.", type: 'info', timestamp: Date.now() });
            }
            const target = combat.enemies.find(e => e.id === targetId);
            if (!target || target.stats.PV <= 0) return;

            const damage = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
            const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, target.stats.Esquive);
            let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;

            if (isCrit) {
                get().applySpecialEffect('ON_CRITICAL_HIT', { targetId, isCrit });
            }
            get().applySpecialEffect('ON_HIT', { targetId, isCrit });

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
            if ((combat.skillCooldowns[skillId] || 0) > 0) {
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

            let effectApplied = false;
            const skillEffects = skill.effets.join(' ');

            if (skill.id === 'cleric_holy_prayer_of_healing') {
                player.activeBuffs.push({
                    id: 'prayer_of_healing_hot',
                    duration: 12000, // 12 seconds
                    healingPerTick: 10, // 120 total heal
                    tickInterval: 1000, // 1s tick
                    nextTickIn: 1000,
                });
                combat.log.push({ message: `Vous êtes enveloppé par une Prière de guérison.`, type: 'heal', timestamp: Date.now() });
                effectApplied = true;
            } else {
                const healMatch = skillEffects.match(/rend ([\d/]+) PV/) || skillEffects.match(/soigne de ([\d/]+) PV/);
                if (healMatch) {
                    const healValueString = `rend ${healMatch[1]} PV`;
                    const healAmount = getTalentEffectValue(healValueString, rank);
                    const maxHp = formulas.calculateMaxHP(player.level, player.stats);
                    const oldHp = player.stats.PV;
                    player.stats.PV = Math.min(maxHp, player.stats.PV + healAmount);
                    const actualHeal = Math.round(player.stats.PV - oldHp);
                    if (actualHeal > 0) {
                        combat.log.push({ message: `Vous utilisez ${skill.nom} et récupérez ${actualHeal} PV.`, type: 'heal', timestamp: Date.now() });
                        effectApplied = true;
                    }
                }
            }

            const shieldMatch = skillEffects.match(/Absorbe (\d+) points de dégâts/) || skillEffects.match(/absorbe (\d+) dégâts/);
            if (shieldMatch) {
                const shieldValue = parseInt(shieldMatch[1], 10);
                player.shield += shieldValue;
                combat.log.push({ message: `Vous utilisez ${skill.nom} et gagnez un bouclier de ${shieldValue} points.`, type: 'shield', timestamp: Date.now() });
                if (skill.id === 'mage_arcane_shield') {
                    player.activeBuffs.push({ id: 'mana_shield', duration: 20000, value: 0.5 }); // 50% damage to mana
                }
                effectApplied = true;
            }

            if (skill.id === 'mage_arcane_missiles') {
                const target = combat.enemies[combat.targetIndex];
                if (target && target.stats.PV > 0) {
                    const waves = getTalentEffectValue(skill.effets[0], rank);
                    const damagePerWave = 5; // As per description
                    combat.pendingActions.push({
                        type: 'damage_wave',
                        skillId: skill.id,
                        wavesLeft: waves,
                        damagePerWave,
                        targetId: target.id,
                        interval: 500, // 0.5s between waves
                        nextWaveIn: 0,
                    });
                    effectApplied = true;
                }
            }

            const damageMatch2 = skillEffects.match(/Inflige/) || skillEffects.match(/dégâts de l'arme/);
            if (damageMatch2 && skill.id !== 'mage_arcane_missiles') {
                if (!combat.enemies || combat.enemies.length === 0) {
                    if (!effectApplied) return;
                } else {
                    const isAoE = skillEffects.includes("tous les ennemis") || skillEffects.includes("ennemis proches");
                    const primaryTarget = combat.enemies[combat.targetIndex];
                    const targets = isAoE ? [...combat.enemies.filter(e => e.stats.PV > 0)] : (primaryTarget && primaryTarget.stats.PV > 0 ? [primaryTarget] : []);

                    if (targets.length > 0) {
                        effectApplied = true;
                        targets.forEach(target => {
                            const currentTarget = combat.enemies.find(e => e.id === target.id);
                            if (!currentTarget) return;

                            let damage = 0;
                            if (skill.classeId === 'berserker' || skill.classeId === 'rogue') {
                                const dmgMultiplierMatch = skillEffects.match(/(\d+)% des dégâts de l'arme/);
                                const dmgMultiplier = dmgMultiplierMatch ? parseInt(dmgMultiplierMatch[1], 10) / 100 : 1;
                                const baseDmg = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
                                damage = baseDmg * dmgMultiplier;
                            } else if (skill.classeId === 'mage' || skill.classeId === 'cleric') {
                                const baseDmg = getTalentEffectValue(skill.effets[0], rank);
                                damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(player.stats));
                            }

                            if (skill.id === 'berserker_execute') {
                                const hpPercent = (currentTarget.stats.PV / currentTarget.initialHp) * 100;
                                if (hpPercent < 20) {
                                    damage *= 3;
                                }
                            }

                            const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, currentTarget.stats.Esquive);
                            if (isCrit) {
                                get().applySpecialEffect('ON_CRITICAL_HIT', { targetId: currentTarget.id, isCrit });
                            }
                            get().applySpecialEffect('ON_HIT', { targetId: currentTarget.id, isCrit });
                            let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
                            const dr = formulas.calculateArmorDR(currentTarget.stats.Armure, player.level);
                            const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                            const msg = `Vous utilisez ${skill.nom} sur ${currentTarget.nom} pour ${mitigatedDamage} points de dégâts.`;
                            const critMsg = `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${currentTarget.nom}.`;

                            currentTarget.stats.PV -= mitigatedDamage;
                            combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });

                            if (skill.id === 'rogue_assassination_poison_bomb') {
                                currentTarget.activeDebuffs = currentTarget.activeDebuffs || [];
                                currentTarget.activeDebuffs.push({
                                    id: 'poison_bomb_dot',
                                    duration: 12000,
                                    damagePerTick: 5, // 60 damage / 12s = 5 dps. Tick every second.
                                    tickInterval: 1000,
                                    nextTickIn: 1000,
                                });
                            }

                            if (currentTarget.stats.PV <= 0) {
                                deadEnemyIds.push(currentTarget.id);
                            }
                        });
                    }
                }
            }

            if (skill.id === 'rogue_subtlety_stealth') {
                combat.isStealthed = true;
                player.activeBuffs.push({ id: 'stealth', duration: 10000 });
                combat.log.push({ message: "Vous vous camouflez dans l'ombre.", type: 'info', timestamp: Date.now() });
                if (state.combat.autoAttack) {
                    state.combat.autoAttack = false;
                }
                effectApplied = true;
            }

            const damageMatch3 = skillEffects.match(/Inflige/) || skillEffects.match(/dégâts de l'arme/);
            if (damageMatch3 && skill.id !== 'mage_arcane_missiles') {
                if (!combat.enemies || combat.enemies.length === 0) {
                    if (!effectApplied) return;
                } else {
                    const isAoE = skillEffects.includes("tous les ennemis") || skillEffects.includes("ennemis proches");
                    const primaryTarget = combat.enemies[combat.targetIndex];
                    const targets = isAoE ? [...combat.enemies.filter((e: CombatEnemy) => e.stats.PV > 0)] : (primaryTarget && primaryTarget.stats.PV > 0 ? [primaryTarget] : []);

                    if (targets.length > 0) {
                        effectApplied = true;
                        targets.forEach((target: CombatEnemy) => {
                            const currentTarget = combat.enemies.find((e: CombatEnemy) => e.id === target.id);
                            if (!currentTarget) return;

                            let damage = 0;
                            if (skill.classeId === 'berserker' || skill.classeId === 'rogue') {
                                const dmgMultiplierMatch = skillEffects.match(/(\d+)% des dégâts de l'arme/);
                                let dmgMultiplier = dmgMultiplierMatch ? parseInt(dmgMultiplierMatch[1], 10) / 100 : 1;

                                if (skill.id === 'rogue_subtlety_surprise_attack' && combat.isStealthed) {
                                    dmgMultiplier *= 2; // 100% damage increase
                                    combat.isStealthed = false;
                                    combat.log.push({ message: "Attaque depuis les ombres !", type: 'info', timestamp: Date.now() });
                                }

                                const baseDmg = formulas.calculateMeleeDamage(player.stats.AttMin, player.stats.AttMax, formulas.calculateAttackPower(player.stats));
                                damage = baseDmg * dmgMultiplier;
                            } else if (skill.classeId === 'mage' || skill.classeId === 'cleric') {
                                const baseDmg = getTalentEffectValue(skill.effets[0], rank);
                                damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(player.stats));
                            }

                            if (skill.id === 'berserker_execute') {
                                const hpPercent = (currentTarget.stats.PV / currentTarget.initialHp) * 100;
                                if (hpPercent < 20) {
                                    damage *= 3;
                                }
                            }

                            const isCrit = formulas.isCriticalHit(player.stats.CritPct, player.stats.Precision, currentTarget.stats.Esquive);
                            let finalDamage = isCrit ? damage * (player.stats.CritDmg / 100) : damage;
                            const dr = formulas.calculateArmorDR(currentTarget.stats.Armure, player.level);
                            const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                            const msg = `Vous utilisez ${skill.nom} sur ${currentTarget.nom} pour ${mitigatedDamage} points de dégâts.`;
                            const critMsg = `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${currentTarget.nom}.`;

                            currentTarget.stats.PV -= mitigatedDamage;
                            combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });

                            if (currentTarget.stats.PV <= 0) {
                                deadEnemyIds.push(currentTarget.id);
                            }
                        });
                    }
                }
            }

            if (effectApplied) {
                if (combat.isStealthed && skill.id !== 'rogue_subtlety_stealth') {
                    combat.isStealthed = false;
                }
                player.resources.current -= resourceCost;
                combat.skillCooldowns[skillId] = (skill.cooldown || 0) * 1000;
                state.combat.playerAttackProgress = 0;
            }
        });

        deadEnemyIds.forEach(enemyId => {
            const enemy = get().combat.enemies.find(e => e.id === enemyId);
            if (enemy) {
                get().handleEnemyDeath(enemy, skillId);
            }
        });
      },

      enemyAttacks: () => {
        const { combat } = get();
        if (combat.isStealthed) {
            set((state: GameState) => {
                state.combat.enemies.forEach(enemy => {
                    if (enemy.attackProgress >= 1) {
                        enemy.attackProgress = 0; // Reset attack progress if player is stealthed
                    }
                });
            });
            return;
        }

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

                let damageToPlayer = mitigatedEnemyDamage;
                if (state.player.shield > 0) {
                    const manaShieldBuff = state.player.activeBuffs.find(b => b.id === 'mana_shield');
                    let shieldAbsorption = Math.min(state.player.shield, damageToPlayer);

                    if (manaShieldBuff && state.player.resources.type === 'Mana') {
                        const manaDrain = Math.floor(shieldAbsorption * manaShieldBuff.value);
                        const actualManaDrained = Math.min(manaDrain, state.player.resources.current);

                        state.player.resources.current -= actualManaDrained;
                        shieldAbsorption -= (manaDrain - actualManaDrained);

                        state.combat.log.push({ message: `Votre bouclier convertit ${actualManaDrained} dégâts en perte de mana.`, type: 'shield', timestamp: Date.now() });
                    }

                    state.player.shield -= shieldAbsorption;
                    damageToPlayer -= shieldAbsorption;
                    state.combat.log.push({ message: `L'attaque de ${enemy.nom} est absorbée par votre bouclier pour ${shieldAbsorption} points.`, type: 'shield', timestamp: Date.now() });
                }

                if (damageToPlayer > 0) {
                    state.player.stats.PV -= damageToPlayer;
                    state.combat.log.push({ message: `${enemy.nom} vous inflige ${damageToPlayer} points de dégâts.`, type: 'enemy_attack', timestamp: Date.now() });
                }

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
                state.combat.log.push({ message: `Vous avez été vaincu ! Vous perdez ${goldPenalty} or et tous les objets trouvés dans le donjon. Retour en ville.`, type: 'info', timestamp: Date.now() });

                const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                state.player.stats.PV = maxHp * 0.2;

                if (state.player.resources.type !== 'Rage') {
                    state.player.resources.current = state.player.resources.max * 0.2;
                } else {
                    state.player.resources.current = 0;
                }

                state.view = 'MAIN';
                if (gameLoop) clearInterval(gameLoop);
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
            const { gameData, currentDungeon, activeQuests, isHeroicMode, worldTier } = state;

            const palierMultiplier = currentDungeon ? Math.floor(currentDungeon.palier / 2) + 1 : 1;
            let goldDrop = (5 + palierMultiplier * 2);
            if (isHeroicMode) {
              goldDrop *= 5;
            }
            const itemDrop = resolveLoot(enemy, gameData, state.player.classeId, activeQuests, worldTier);
            const xpGained = Math.round((enemy.level * 10) * (1 + (currentDungeon ? currentDungeon.palier * 0.05 : 0)));

            state.combat.log.push({ message: `You defeated ${enemy.nom}!`, type: 'info', timestamp: Date.now() });
            state.combat.log.push({ message: `You find ${goldDrop} gold.`, type: 'loot', timestamp: Date.now() });
            state.combat.goldGained += goldDrop;

            state.combat.xpGained += xpGained;
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
              } else if (quete.type === 'chasse_boss' && req.dungeonId === currentDungeon?.id && enemy.isBoss && enemy.templateId === req.bossId) {
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
                        get().endDungeon();
                    } else if (get().combat.killCount >= currentDungeon.killTarget) {
                        const bossTemplate = gameData.monsters.find(m => m.id === currentDungeon.bossId);
                        if (bossTemplate) {
                            const bossInstance: CombatEnemy = {
                                ...JSON.parse(JSON.stringify(bossTemplate)),
                                id: uuidv4(),
                                templateId: bossTemplate.id, // <-- Ligne ajoutée
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
            state.view = 'MAIN';
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

      applySpecialEffect: (trigger, context) => {
        set((state: GameState) => {
            Object.values(state.inventory.equipment).forEach(item => {
                if (item?.specialEffect?.trigger === trigger) {
                    const effect = item.specialEffect;
                    console.log(`Applying special effect: ${effect.effect} from item ${item.name}`);

                    switch (effect.effect) {
                        case 'APPLY_BLEED':
                            const target = state.combat.enemies.find(e => e.id === context.targetId);
                            if (target && effect.details) {
                                target.activeDebuffs = target.activeDebuffs || [];
                                target.activeDebuffs.push({
                                    id: 'bleed',
                                    duration: effect.details.duration,
                                    damagePerTick: effect.details.damagePerTick,
                                    tickInterval: 1000,
                                    nextTickIn: 1000,
                                });
                                state.combat.log.push({ message: `${target.nom} is bleeding!`, type: 'enemy_attack', timestamp: Date.now() });
                            }
                            break;
                        case 'RESET_SKILL_COOLDOWN':
                            if (context.isCrit && effect.skillId && state.combat.skillCooldowns[effect.skillId]) {
                                delete state.combat.skillCooldowns[effect.skillId];
                                state.combat.log.push({ message: `Your critical hit reset the cooldown of ${effect.skillId}!`, type: 'info', timestamp: Date.now() });
                            }
                            break;
                    }
                }
            });
        });
      },
    })),
    {
      name: 'barquest-save',
      storage: storage,
      onRehydrateStorage: () => (state: GameState | undefined) => {
        if (state) {
            state.rehydrateComplete = true;
            state.view = 'MAIN';
            state.combat = initialCombatState;
            state.player.learnedTalents = state.player.learnedTalents || {};
            state.player.activeBuffs = state.player.activeBuffs || [];
            state.player.reputation = state.player.reputation || {};
            state.player.completedQuests = Array.isArray(state.player.completedQuests) ? state.player.completedQuests : [];
            state.activeQuests = Array.isArray(state.activeQuests) ? state.activeQuests : [];
            state.player.completedDungeons = (state.player.completedDungeons && typeof state.player.completedDungeons === 'object' && !Array.isArray(state.player.completedDungeons)) ? state.player.completedDungeons : {};

            if(typeof state.inventory.potions !== 'object' || state.inventory.potions === null) {
              state.inventory.potions = { health: 0, resource: 0};
            }
            if(typeof state.inventory.craftingMaterials !== 'object' || state.inventory.craftingMaterials === null) {
                state.inventory.craftingMaterials = {};
            }
        }
      }
    }
  )
);
