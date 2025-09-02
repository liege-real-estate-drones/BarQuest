import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Skill, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Quete, PlayerClassId, ResourceType, Rareté, CombatEnemy, ItemSet, PotionType, Recipe, Theme, Affixe, Enchantment, Buff, Debuff, FloatingText, FloatingTextType } from '@/lib/types';
import { DungeonCompletionSummary } from '@/data/schemas';
import * as formulas from '@/core/formulas';
import { getModifiedStats, getRankValue } from '@/core/formulas';
import { generateProceduralItem } from '@/core/itemGenerator';
import { v4 as uuidv4 } from 'uuid';
import { AFFIX_TO_THEME } from '@/lib/constants';
import { processSkill, applyPoisonProc } from '@/core/skillProcessor';

export interface ActiveQuete {
  quete: Quete;
  progress: number;
  startTime?: number; // Pour les quêtes de temps
}

const getInitialPlayerState = (): PlayerState => {
  return {
    id: uuidv4(),
    name: "Hero",
    classeId: null,
    level: 1,
    xp: 0,
    baseStats: {} as Stats,
    stats: {} as Stats,
    talentPoints: 0,
    learnedSkills: {},
    learnedTalents: {},
    learnedRecipes: ['enchant_minor_strength', 'enchant_minor_armor'],
    equippedSkills: [null, null, null, null],
    resources: {
      current: 0,
      max: 0,
      type: 'Mana',
    },
    reputation: {},
    activeEffects: [],
    activeBuffs: [],
    activeDebuffs: [],
    activeSetBonuses: [],
    completedDungeons: {},
    completedQuests: [],
    shield: 0,
    invulnerabilityDuration: 0,
    stunDuration: 0,
    form: null,
    isImmuneToCC: false,
    nextAttackIsGuaranteedCrit: false,
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
    monsterSkillCooldowns: {},
    killCount: 0,
    log: [],
    autoAttack: true,
    dungeonRunItems: [],
    targetIndex: 0,
    pendingActions: [],
    isStealthed: false,
    goldGained: 0,
    xpGained: 0,
    ultimateTalentUsed: false,
    floatingTexts: [],
};

export interface GameState {
  isInitialized: boolean;
  rehydrateComplete: boolean;
  lastPlayed: number | null;
  view: 'MAIN' | 'COMBAT' | 'DUNGEON_COMPLETED';
  activeSubView: 'TOWN' | 'CHARACTER' | 'VENDORS' | 'DUNGEONS_LIST' | 'QUESTS' | 'SKILLS' | 'TALENTS' | 'REPUTATION';
  townView: 'TOWN' | 'CRAFTING';
  worldTier: number;
  currentDungeon: Dungeon | null;
  dungeonState: {
    equipmentDropsPending: number;
    monstersRemainingInDungeon: number;
  } | null;
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

  craftItem: (recipeId: string) => Item | { error: string } | null;
  setHeroicMode: (isHeroic: boolean) => void;
  setActiveSubView: (view: GameState['activeSubView']) => void;
  setTownView: (view: 'TOWN' | 'CRAFTING') => void;
  setWorldTier: (tier: number) => void;
  setBossEncounter: (monster: Monstre | null) => void; // NOUVEAU: Action pour gérer l'alerte
  setProposedQuests: (quests: Quete[] | null) => void;
  setTargetIndex: (index: number) => void;
  checkAndApplyLevelUp: () => void;
  initializeGameData: (data: Partial<GameData>) => void;
  setPlayerClass: (classId: PlayerClassId, name: string) => void;
  recalculateStats: (options?: { forceRestore?: boolean }) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (slot: keyof InventoryState['equipment']) => void;
  buyItem: (itemId: string) => boolean; // Modifié pour accepter un string
  sellItem: (itemId: string) => void;
  sellAllUnusedItems: () => { soldCount: number; goldGained: number };
  learnSkill: (skillId: string) => void;
  learnTalent: (talentId: string) => void;
  learnRecipe: (recipeId: string) => void;
  equipSkill: (skillId: string, slot: number) => void;
  unequipSkill: (slot: number) => void;
  resetGame: () => void;

  // Inn actions
  buyPotion: (potionType: PotionType) => boolean;
  rest: () => boolean;
  consumePotion: (potionType: PotionType) => void;

  // Quest actions
  acceptQuest: (questId: string) => void;
  acceptMultipleQuests: (questIds: string[]) => void;

  // Floating Text actions
  addFloatingText: (entityId: string, text: string, type: FloatingTextType) => void;
  removeFloatingText: (id: string) => void;

  endDungeon: () => void;
  closeDungeonSummary: () => void;
  enterDungeon: (dungeonId: string) => void;
  startCombat: () => void;
  gameTick: (delta: number) => void;
  playerAttack: (targetId: string, isCleave?: boolean, skillId?: string) => void;
  activateSkill: (skillId: string) => void;
  enemyAttacks: () => void;
  handleEnemyDeath: (enemy: CombatEnemy, skillId?: string) => void;
  cycleTarget: () => void;
  flee: () => void;
  toggleAutoAttack: () => void;
  getXpToNextLevel: () => number;
  applyTalentTrigger: (trigger: 'on_dodge' | 'on_critical_hit' | 'on_hit', context?: { targetId?: string, skill?: Skill, attackerId?: string }) => void;
      applySpecialEffect: (trigger: string, context: { targetId: string, isCrit: boolean, skill?: Skill }) => void;
  dismantleItem: (itemId: string) => { id: string, amount: number }[] | undefined;
  dismantleAllUnusedItems: (maxRarity: Rareté) => { dismantledCount: number; materialsGained: Record<string, number> };
  enchantItem: (itemId: string, enchantmentId: string) => void;
  buyRecipe: (enchantmentId: string) => boolean;
  gambleForItem: (itemSlot: string) => Item | null;
}

let gameLoop: NodeJS.Timeout | null = null;

const rarityDropChances: Record<Rareté, number> = {
  Commun: 0.55,
  Magique: 0.15,
  Rare: 0.25,
  Épique: 0.04,
  Légendaire: 0.01,
  Unique: 0.0,
};

const resolveLoot = (monster: Monstre, gameData: GameData, playerClassId: PlayerClassId | null, worldTier: number): Item | null => {
  // --- 1. Boss Specific Loot ---
  if (monster.isBoss && monster.specificLootTable && Math.random() < 0.1) { // 10% chance for a specific drop
    const specificLootId = monster.specificLootTable[Math.floor(Math.random() * monster.specificLootTable.length)];
    const specificItem = gameData.items.find(item => item.id === specificLootId);
    if (specificItem) {
      return { ...specificItem, id: uuidv4() };
    }
  }

  // --- 2. Determine Rarity ---
  // Auparavant, il y avait 80% de chance de ne rien obtenir. Je réduis ce taux.
  if (Math.random() > 0.95) { // 5% chance of no loot at all
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
      item.slot &&
      item.slot !== 'potion' &&
      item.rarity !== "Légendaire" &&
      item.rarity !== "Unique" &&
      !item.set &&
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
    gameData.affixes,
    baseItemTemplate.id
  );

  return newItem;
};

const biomeToTheme = (biome: Dungeon['biome'] | undefined): Theme | undefined => {
  if (!biome) return undefined;
  const mapping: Record<string, Theme> = {
    frost: 'ice',
    fire: 'fire',
    nature: 'nature',
    occult: 'shadow',
  };
  return mapping[biome];
};

const generateEquipmentLoot = (monster: Monstre, gameData: GameData, playerClassId: PlayerClassId | null, worldTier: number, dungeon?: Dungeon, monsterFamily?: string): Item | null => {
  // --- 1. Boss Specific Loot ---
  if (monster.isBoss && monster.specificLootTable && Math.random() < 0.25) { // 25% chance for a specific drop
    const specificLootId = monster.specificLootTable[Math.floor(Math.random() * monster.specificLootTable.length)];
    const specificItem = gameData.items.find(item => item.id === specificLootId);
    if (specificItem) {
      // Return a copy of the unique item
      return { ...specificItem, id: uuidv4(), baseId: specificItem.id };
    }
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

  if (chosenRarity === "Légendaire" || chosenRarity === "Unique") {
    const possibleItems = gameData.items.filter(item =>
        item.rarity === chosenRarity &&
        (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
    );

    if (possibleItems.length > 0) {
        const droppedItem = { ...possibleItems[Math.floor(Math.random() * possibleItems.length)] };
        // @ts-ignore
        droppedItem.baseId = droppedItem.id;
        droppedItem.id = uuidv4();
        return droppedItem;
    }
    chosenRarity = "Épique";
  }

  const possibleItemTemplates = gameData.items.filter(item =>
      item.slot && item.slot !== 'potion' && item.rarity !== "Légendaire" && item.rarity !== "Unique" && !item.set &&
      (item.tagsClasse?.includes('common') || (playerClassId && item.tagsClasse?.includes(playerClassId)))
  );

  if (possibleItemTemplates.length === 0) {
    return null;
  }

  const baseItemTemplate = possibleItemTemplates[Math.floor(Math.random() * possibleItemTemplates.length)];
  const { id, niveauMin, rarity, affixes, ...baseItemProps } = baseItemTemplate;
  const itemLevel = monster.level + (worldTier - 1) * 5;
  const newItem = generateProceduralItem(baseItemProps, itemLevel, chosenRarity, gameData.affixes, baseItemTemplate.id, dungeon);

  return newItem;
};

const getTalentEffectValue = (effect: string, rank: number): number => {
    if (typeof effect !== 'string') {
        console.error("Invalid talent effect format: expected a string, but got", typeof effect);
        return 0;
    }
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
        Magique: 1.5,
        Rare: 2.5,
        Épique: 5,
        Légendaire: 10,
        Unique: 20,
    };
    return Math.ceil(item.niveauMin * rarityMultiplier[item.rarity]);
};

export const getItemBuyPrice = (item: Item): number => {
    if (item.vendorPrice) {
        return item.vendorPrice;
    }
    // Re-using the logic from getItemSellPrice to calculate the base sell price
    const rarityMultiplier: Record<Rareté, number> = {
        Commun: 1,
        Magique: 1.5,
        Rare: 2.5,
        Épique: 5,
        Légendaire: 10,
        Unique: 20,
    };
    // The sell price is item.niveauMin * rarityMultiplier. Buy price is 4x that.
    const calculatedSellPrice = Math.ceil(item.niveauMin * rarityMultiplier[item.rarity]);
    return calculatedSellPrice * 4;
};

export const getRecipePrice = (enchantment: Enchantment): number => {
    const tier = enchantment.tier || 1;
    const level = enchantment.level || 1;
    return (tier * 25) * (level / 2.5);
};

type StatWeightKeys = 'PV' | 'RessourceMax' | 'Force' | 'Intelligence' | 'Dexterite' | 'Esprit' | 'AttMin' | 'AttMax' | 'CritPct' | 'CritDmg' | 'Armure' | 'Vitesse' | 'Precision' | 'Esquive';

export const STAT_WEIGHTS: Record<PlayerClassId, Partial<Record<StatWeightKeys, number>> & { DmgElems?: Partial<Record<Theme, number>> }> = {
    berserker: { Force: 2, AttMin: 1.2, AttMax: 1.2, CritPct: 1, CritDmg: 0.8, Armure: 0.6, PV: 0.8, DmgElems: { shadow: 1, fire: 1, ice: 1, nature: 1 } },
    mage: { Intelligence: 2, CritPct: 1.2, CritDmg: 1, Vitesse: 1, Esprit: 0.7, PV: 0.5, DmgElems: { shadow: 1.5, fire: 1.5, ice: 1.5, nature: 1.5 } },
    rogue: { Dexterite: 2, Vitesse: 1.5, CritPct: 1.5, CritDmg: 1.2, AttMin: 1, AttMax: 1, DmgElems: { shadow: 1, fire: 1, ice: 1, nature: 1 } },
    cleric: { Esprit: 2, Intelligence: 1.5, PV: 1, Armure: 0.8, CritPct: 0.7, DmgElems: { shadow: 1.2, fire: 1.2, ice: 1.2, nature: 1.2 } },
};

export const calculateItemScore = (item: Item, classId: PlayerClassId): number => {
    let score = 0;
    if (!item || !classId) return 0;

    const weights = STAT_WEIGHTS[classId];

    (item.affixes || []).forEach(affix => {
        const statKey = affix.ref as StatWeightKeys;
        const weight = weights[statKey] || 0.1;
        score += affix.val * weight;
    });

    if (item.stats) {
        Object.entries(item.stats).forEach(([key, value]) => {
            if (key === 'DmgElems' || key === 'ResElems') return;
            const statKey = key as StatWeightKeys;
            const weight = weights[statKey] || 0.1;
            if (typeof value === 'number') {
                score += value * weight;
            }
        });

        if (item.stats.DmgElems && weights.DmgElems) {
            Object.entries(item.stats.DmgElems).forEach(([elem, dmg]) => {
                const weight = weights.DmgElems?.[elem as Theme] || 0;
                if(typeof dmg === 'number') {
                    score += dmg * weight;
                }
            });
        }
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
      activeSubView: 'TOWN',
      townView: 'TOWN',
      worldTier: 1,
      currentDungeon: null,
      dungeonState: null,
      dungeonStartTime: null,
      dungeonCompletionSummary: null,
      gameData: { dungeons: [], monsters: [], items: [], talents: [], skills: [], affixes: [], classes: [], quests: [], factions: [], sets: [], recipes: [], enchantments: [], components: [] },
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

      setActiveSubView: (view) => {
        set ({ activeSubView: view });
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

      setTargetIndex: (index: number) => {
        set((state: GameState) => {
          state.combat.targetIndex = index;
        });
      },

      checkAndApplyLevelUp: () => {
        const playerLevelBefore = get().player.level;
        let didLevelUp = false;

        set((state) => {
            // Inlined getXpToNextLevel to avoid using get() inside set()
            let xpToNext = Math.floor(100 * Math.pow(state.player.level, 1.5));

            while (state.player.xp >= xpToNext) {
                didLevelUp = true;
                state.player.level++;
                state.player.talentPoints += 1;
                state.player.xp -= xpToNext;
                state.combat.log.push({
                    message: `Félicitations ! Vous avez atteint le niveau ${state.player.level} !`,
                    type: 'levelup',
                    timestamp: Date.now(),
                });
                // Recalculate for the new level, still inside the atomic update
                xpToNext = Math.floor(100 * Math.pow(state.player.level, 1.5));
            }
        });

        if (didLevelUp) {
          get().recalculateStats({ forceRestore: true });
          set((state) => {
            state.combat.log.push({
                message: `Vous vous sentez ragaillardi par votre montée en niveau ! PV et ressource restaurés.`,
                type: 'heal',
                timestamp: Date.now(),
            });
          });
        }
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
            state.gameData.enchantments = Array.isArray(data.enchantments) ? data.enchantments : [];
            state.gameData.components = Array.isArray(data.components) ? data.components : [];
            state.isInitialized = true;
        });
      },

      craftItem: (recipeId: string) => {
        let result: Item | { error: string } | null = null;
        set((state: GameState) => {
          const recipe = state.gameData.recipes.find(r => r.id === recipeId);
          if (!recipe) { console.error(`Recipe ${recipeId} not found.`); result = null; return; }
          if (state.inventory.gold < recipe.cost) { result = { error: "Pas assez d'or." }; return; }

          const requiredItems: Record<string, number> = {};
          const requiredComponents: Record<string, number> = {};

          Object.entries(recipe.materials).forEach(([key, value]) => {
            if (key.startsWith('item:')) {
              requiredItems[key.substring(5)] = value;
            } else {
              requiredComponents[key] = value;
            }
          });

          // Pre-check components
          for (const [id, amount] of Object.entries(requiredComponents)) {
            if ((state.inventory.craftingMaterials[id] || 0) < amount) {
              const comp = state.gameData.components.find(c => c.id === id);
              result = { error: `Manque de ${comp?.name || id}` };
              return;
            }
          }

          // Pre-check items and prepare for consumption
          const inventoryItemsCopy = [...state.inventory.items];
          const consumedItemIndices: number[] = [];

          for (const [baseId, amount] of Object.entries(requiredItems)) {
            let foundCount = 0;
            for (let i = 0; i < inventoryItemsCopy.length; i++) {
              if (inventoryItemsCopy[i].baseId === baseId) {
                if (!consumedItemIndices.includes(i)) {
                  consumedItemIndices.push(i);
                  foundCount++;
                  if (foundCount === amount) break;
                }
              }
            }
            if (foundCount < amount) {
              const item = state.gameData.items.find(i => i.id === baseId);
              result = { error: `Manque de ${item?.name || baseId}` };
              return;
            }
          }

          // --- All checks passed, proceed with transaction ---
          state.inventory.gold -= recipe.cost;

          for (const [id, amount] of Object.entries(requiredComponents)) {
            state.inventory.craftingMaterials[id] -= amount;
          }

          consumedItemIndices.sort((a, b) => b - a);
          for (const index of consumedItemIndices) {
            state.inventory.items.splice(index, 1);
          }

          const baseItem = state.gameData.items.find(i => i.id === recipe.result);
          if (!baseItem) { console.error(`Result item ${recipe.result} not found.`); result = null; return; }

          const newItem: Item = { ...baseItem, id: uuidv4(), baseId: baseItem.id };
          state.inventory.items.push(newItem);
          result = newItem;
        });
        return result;
      },

      gambleForItem: (itemSlot: string) => {
          const state = get();
          const cost = 100 * state.worldTier;
          if (state.inventory.gold < cost) {
              console.log("Not enough gold to gamble");
              return null;
          }

          const possibleTemplates = state.gameData.items.filter(item => item.slot === itemSlot && item.rarity !== "Légendaire" && item.rarity !== "Unique" && !item.set);
          if (possibleTemplates.length === 0) {
              console.log("No items found for that slot");
              return null;
          }

          const roll = Math.random();
          let rarity: Rareté = "Commun";
          if (roll < 0.02) rarity = "Légendaire";
          else if (roll < 0.10) rarity = "Épique";
          else if (roll < 0.35) rarity = "Rare";

          const baseItemTemplate = possibleTemplates[Math.floor(Math.random() * possibleTemplates.length)];
          const itemLevel = state.player.level;
          const { id, niveauMin, affixes, ...baseItemProps } = baseItemTemplate;
          const newItem = generateProceduralItem(baseItemProps, itemLevel, rarity, state.gameData.affixes, baseItemTemplate.id, undefined);

          set((currentState: GameState) => {
              currentState.inventory.gold -= cost;
              currentState.inventory.items.push(newItem);
          });

          return newItem;
      },

      dismantleAllUnusedItems: (maxRarity) => {
        const rarityOrder: Record<Rareté, number> = {
            'Commun': 0, 'Magique': 1, 'Rare': 2, 'Épique': 3, 'Légendaire': 4, 'Unique': 5
        };
        const maxRarityValue = rarityOrder[maxRarity];
        let dismantledCount = 0;
        const totalMaterialsGained: Record<string, number> = {};

        set((state: GameState) => {
            const itemsToKeep: Item[] = [];
            const itemsToDismantle: Item[] = [];

            state.inventory.items.forEach(item => {
                const itemRarityValue = rarityOrder[item.rarity];
                if (item.type !== 'quest' && itemRarityValue < maxRarityValue) {
                    itemsToDismantle.push(item);
                } else {
                    itemsToKeep.push(item);
                }
            });

            dismantledCount = itemsToDismantle.length;
            if (dismantledCount === 0) {
                return;
            }

            itemsToDismantle.forEach(itemToDismantle => {
                // Re-using the single-item dismantle logic to calculate materials
                const { rarity, niveauMin } = itemToDismantle;
                let materialsGained: { id: string, amount: number }[] = [];
                if (niveauMin >= 1 && niveauMin < 15) {
                    if (rarity === 'Commun' || rarity === 'Magique') {
                        materialsGained.push({ id: 'strange_dust', amount: Math.floor(Math.random() * 2) + 1 });
                        if (rarity === 'Magique' && Math.random() < 0.35) {
                            materialsGained.push({ id: 'lesser_magic_essence', amount: 1 });
                        }
                    }
                }
                if (niveauMin >= 15 && niveauMin < 30) {
                     if (rarity === 'Commun') {
                        materialsGained.push({ id: 'soul_dust', amount: 1 });
                     } else if (rarity === 'Magique' || rarity === 'Rare') {
                        materialsGained.push({ id: 'soul_dust', amount: Math.floor(Math.random() * 2) + 1 });
                        if (rarity === 'Rare' && Math.random() < 0.35) {
                            materialsGained.push({ id: 'greater_magic_essence', amount: 1 });
                        }
                    }
                }
                if (niveauMin >= 30 && niveauMin < 50) {
                    if (rarity === 'Commun' || rarity === 'Magique') {
                        materialsGained.push({ id: 'vision_dust', amount: 1 });
                    } else if (rarity === 'Rare' || rarity === 'Épique') {
                        materialsGained.push({ id: 'vision_dust', amount: Math.floor(Math.random() * 2) + 1 });
                        if (rarity === 'Épique' && Math.random() < 0.35) {
                            materialsGained.push({ id: 'lesser_astral_essence', amount: 1 });
                        }
                    }
                }
                if (niveauMin >= 50) {
                     if (rarity === 'Commun' || rarity === 'Magique' || rarity === 'Rare') {
                        materialsGained.push({ id: 'eternity_dust', amount: 1 });
                    } else if (rarity === 'Épique') {
                        materialsGained.push({ id: 'eternity_dust', amount: Math.floor(Math.random() * 3) + 1 });
                         if (Math.random() < 0.35) {
                            materialsGained.push({ id: 'greater_astral_essence', amount: 1 });
                        }
                    }
                }
                if (rarity === 'Légendaire') {
                    materialsGained.push({ id: 'eternity_dust', amount: Math.floor(Math.random() * 4) + 2 });
                    materialsGained.push({ id: 'nexus_crystal', amount: 1 });
                    if (Math.random() < 0.5) {
                        materialsGained.push({ id: 'prismatic_shard', amount: 1 });
                    }
                }
                itemToDismantle.affixes?.forEach(affix => {
                    const theme = AFFIX_TO_THEME[affix.ref];
                    if (theme) {
                        const elementalMaterials: Record<string, string> = {
                            fire: 'eternal_fire',
                            ice: 'crystalline_water',
                            nature: 'primordial_earth',
                            shadow: 'frozen_shadow'
                        };
                        if (elementalMaterials[theme] && Math.random() < 0.15) {
                             materialsGained.push({ id: elementalMaterials[theme], amount: 1 });
                        }
                    }
                });

                materialsGained.forEach(mat => {
                    totalMaterialsGained[mat.id] = (totalMaterialsGained[mat.id] || 0) + mat.amount;
                    state.inventory.craftingMaterials[mat.id] = (state.inventory.craftingMaterials[mat.id] || 0) + mat.amount;
                });
            });

            state.inventory.items = itemsToKeep;
        });

        return { dismantledCount, materialsGained: totalMaterialsGained };
      },

      dismantleItem: (itemId) => {
        let materialsGained: { id: string, amount: number }[] | undefined = undefined;

        set((state: GameState) => {
            const itemIndex = state.inventory.items.findIndex(i => i.id === itemId);
            if (itemIndex === -1) {
                materialsGained = undefined;
                return;
            }

            const itemToDismantle = state.inventory.items[itemIndex];
            if (itemToDismantle.type === 'quest') {
                console.log("Cannot dismantle quest items.");
                materialsGained = undefined;
                return;
            }
            state.inventory.items.splice(itemIndex, 1);

            const { rarity, niveauMin, slot, type } = itemToDismantle;
            const calculatedMaterials: { id: string, amount: number }[] = [];

            // 1. Base Materials from Item Type
            if (slot === 'weapon' || slot === 'offhand' || slot === 'chest' || slot === 'legs' || slot === 'hands' || slot === 'feet' || slot === 'head' || slot === 'belt') {
                calculatedMaterials.push({ id: 'scrap_metal', amount: 1 });
                if (type === 'leather' || type === 'mail') {
                    calculatedMaterials.push({ id: 'light_leather', amount: Math.floor(Math.random() * 2) + 1 });
                }
            } else if (slot === 'amulet' || slot === 'ring') {
                 if (Math.random() < 0.2) {
                    calculatedMaterials.push({ id: 'silver_nugget', amount: 1 });
                 }
            }

            // 2. Bonus Materials from Magical Properties (Rarity)
            if (rarity !== 'Commun') {
                if (niveauMin >= 1 && niveauMin < 15) {
                    calculatedMaterials.push({ id: 'strange_dust', amount: Math.floor(Math.random() * 2) + 1 });
                    if (rarity === 'Magique' && Math.random() < 0.35) {
                        calculatedMaterials.push({ id: 'lesser_magic_essence', amount: 1 });
                    }
                }
                if (niveauMin >= 15 && niveauMin < 30) {
                    calculatedMaterials.push({ id: 'soul_dust', amount: Math.floor(Math.random() * 2) + 1 });
                    if (rarity === 'Rare' && Math.random() < 0.35) {
                        calculatedMaterials.push({ id: 'greater_magic_essence', amount: 1 });
                    }
                }
                if (niveauMin >= 30 && niveauMin < 50) {
                    calculatedMaterials.push({ id: 'vision_dust', amount: Math.floor(Math.random() * 2) + 1 });
                    if (rarity === 'Épique' && Math.random() < 0.35) {
                        calculatedMaterials.push({ id: 'lesser_astral_essence', amount: 1 });
                    }
                }
                if (niveauMin >= 50) {
                    calculatedMaterials.push({ id: 'eternity_dust', amount: Math.floor(Math.random() * 3) + 1 });
                     if (rarity === 'Épique' && Math.random() < 0.35) {
                        calculatedMaterials.push({ id: 'greater_astral_essence', amount: 1 });
                    }
                }
                if (rarity === 'Légendaire') {
                    calculatedMaterials.push({ id: 'nexus_crystal', amount: 1 });
                }
            }

            // 3. Bonus Elemental Materials from Affixes
            itemToDismantle.affixes?.forEach(affix => {
                const theme = AFFIX_TO_THEME[affix.ref];
                if (theme) {
                    const elementalMaterials: Record<string, string> = {
                        fire: 'eternal_fire', ice: 'crystalline_water',
                        nature: 'primordial_earth', shadow: 'frozen_shadow'
                    };
                    if (elementalMaterials[theme] && Math.random() < 0.25) {
                         calculatedMaterials.push({ id: elementalMaterials[theme], amount: 1 });
                    }
                }
            });

            // Add materials to inventory
            const finalMaterials: Record<string, number> = {};
            calculatedMaterials.forEach(mat => {
                finalMaterials[mat.id] = (finalMaterials[mat.id] || 0) + mat.amount;
            });

            Object.entries(finalMaterials).forEach(([matId, amount]) => {
                 state.inventory.craftingMaterials[matId] = (state.inventory.craftingMaterials[matId] || 0) + amount;
            });

            materialsGained = Object.entries(finalMaterials).map(([id, amount]) => ({ id, amount }));
        });
        return materialsGained;
      },

      enchantItem: (itemId, enchantmentId) => {
        set((state: GameState) => {
            let item: Item | null = state.inventory.items.find(i => i.id === itemId) || null;

            if (!item) {
                for (const slot in state.inventory.equipment) {
                    const equippedItem = state.inventory.equipment[slot as keyof typeof state.inventory.equipment];
                    if (equippedItem && equippedItem.id === itemId) {
                        item = equippedItem;
                        break;
                    }
                }
            }
            const enchantment = state.gameData.enchantments.find(e => e.id === enchantmentId);

            if (!item || !enchantment) {
                console.error("Item or enchantment not found");
                return;
            }

            // 1. Check cost
            for (const costItem of enchantment.cost) {
                if ((state.inventory.craftingMaterials[costItem.id] || 0) < costItem.amount) {
                    // TODO: Add user feedback
                    return;
                }
            }

            // 2. Subtract cost
            enchantment.cost.forEach(costItem => {
                state.inventory.craftingMaterials[costItem.id] -= costItem.amount;
            });

            // 3. Apply new enchantment
            const newEnchantmentAffix = {
                ref: enchantment.affixRef,
                val: 1, // The value is now part of the affixRef, but we'll parse it in recalculateStats
                isEnchantment: true
            };

            if (!item.affixes) {
                item.affixes = [];
            }
            // Remove old enchantment affix if it exists
            item.affixes = item.affixes.filter(a => !a.isEnchantment);
            item.affixes.push(newEnchantmentAffix);

            // The logic to parse affixRef like 'force_1' will be handled in recalculateStats
            // to ensure it's always correctly calculated.
            get().recalculateStats();
        });
      },

      buyRecipe: (enchantmentId: string) => {
        let success = false;
        set((state: GameState) => {
            const enchantment = state.gameData.enchantments.find(e => e.id === enchantmentId);
            if (!enchantment) {
                console.error("Enchantment not found");
                return;
            }

            // Check reputation requirement
            const repReq = enchantment.reputationRequirement;
            if (repReq) {
                const currentRep = state.player.reputation[repReq.factionId]?.value || 0;
                if (currentRep < repReq.threshold) {
                    console.log("Not enough reputation");
                    return;
                }
            }

            const price = getRecipePrice(enchantment);
            if (state.inventory.gold < price) {
                console.log("Not enough gold for recipe");
                return;
            }

            if (state.player.learnedRecipes.includes(enchantmentId)) {
                console.log("Recipe already learned");
                return;
            }

            state.inventory.gold -= price;
            state.player.learnedRecipes.push(enchantmentId);
            success = true;
        });
        return success;
      },

      setPlayerClass: (classId: PlayerClassId, name: string) => {
        set((state: GameState) => {
            const chosenClass = state.gameData.classes.find(c => c.id === classId);
            if (!chosenClass) return;

            state.player = getInitialPlayerState();
            state.inventory = initialInventoryState;
            state.combat = initialCombatState;
            state.activeQuests = [];

            state.player.name = name;
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

      recalculateStats: (options?: { forceRestore?: boolean }) => {
        set((state: GameState) => {
          const { player, inventory, gameData } = state;
          if (!player.classeId) return;

          // Preserve current HP percentage, as max HP is about to be recalculated.
          const oldMaxHp = formulas.calculateMaxHP(player.level, player.stats);
          const hpPercent = oldMaxHp > 0 ? player.stats.PV / oldMaxHp : 1;


          // Ensure all necessary player properties are initialized to avoid runtime errors
          player.learnedSkills = player.learnedSkills || {};
          player.learnedTalents = player.learnedTalents || {};
          player.equippedSkills = player.equippedSkills || [null, null, null, null];
          player.reputation = player.reputation || {};
          player.activeEffects = []; // Clear active effects, they will be recalculated
          player.activeBuffs = player.activeBuffs || [];
          player.activeSetBonuses = []; // Clear set bonuses, they will be recalculated
          player.completedDungeons = player.completedDungeons || {};
          player.completedQuests = player.completedQuests || [];
          inventory.potions = inventory.potions || { health: 0, resource: 0 };
          state.activeQuests = state.activeQuests || [];

          const classe = gameData.classes.find(c => c.id === player.classeId);
          if (!classe) return;

          // --- Direct Mutation on Immer Draft ---
          // 1. Reset stats to a deep copy of base stats
          player.stats = JSON.parse(JSON.stringify(player.baseStats));
          if (!player.stats.ResElems) {
            player.stats.ResElems = {};
          }
          if (!player.stats.DmgElems) {
            player.stats.DmgElems = {};
          }
          if (!player.stats.BonusDmg) {
            player.stats.BonusDmg = {};
          }

          const equippedSetTiers: Record<string, Record<number, number>> = {};

          // 2. Apply stats from equipped items
          Object.values(inventory.equipment).forEach(item => {
            if (item) {
              // A. Handle base stats from the item (e.g., for Uniques)
              if (item.stats) {
                Object.entries(item.stats).forEach(([statKey, statValue]) => {
                  if (statKey === 'ResElems' || statKey === 'DmgElems') {
                    if (statValue && typeof statValue === 'object') {
                      Object.entries(statValue).forEach(([subKey, subValue]) => {
                        if (typeof subValue === 'number' && player.stats[statKey]) {
                           (player.stats[statKey] as any)[subKey] = ((player.stats[statKey] as any)[subKey] || 0) + subValue;
                        }
                      });
                    }
                  } else {
                    const key = statKey as keyof Stats;
                    if (typeof player.stats[key] === 'number' && typeof statValue === 'number') {
                      (player.stats[key] as number) += statValue;
                    }
                  }
                });
              }

              // B. Handle affixes (including dot notation for nested stats)
              if (item.affixes) {
                item.affixes.forEach(affix => {
                  const { ref, val } = affix;
                  if (ref.includes('.')) {
                    const [mainKey, subKey] = ref.split('.') as [keyof Stats, string];
                    const statObj = player.stats[mainKey];
                    if (statObj && typeof statObj === 'object' && statObj !== null && subKey) {
                      (statObj as any)[subKey] = ((statObj as any)[subKey] || 0) + val;
                    }
                  } else {
                    const statKey = ref as keyof Stats;
                    if (typeof player.stats[statKey] === 'number' && typeof val === 'number') {
                      (player.stats[statKey] as number) += val;
                    }
                  }
                });
              }

              // C. Handle item effects and count set pieces
              if (item.effect) {
                player.activeEffects.push(item.effect);
              }
              if (item.set && item.tier) {
                if (!equippedSetTiers[item.set.id]) {
                  equippedSetTiers[item.set.id] = {};
                }
                equippedSetTiers[item.set.id][item.tier] = (equippedSetTiers[item.set.id][item.tier] || 0) + 1;
              }
            }
          });

          // Merge BonusDmg into DmgElems for consistent use in combat and UI
          if (player.stats.BonusDmg) {
            if (!player.stats.DmgElems) {
              player.stats.DmgElems = {};
            }
            Object.entries(player.stats.BonusDmg).forEach(([elem, value]) => {
              if (player.stats.DmgElems && typeof value === 'number') {
                player.stats.DmgElems[elem] = (player.stats.DmgElems[elem] || 0) + value;
              }
            });
          }

          // 3. Apply tiered set bonuses
          Object.entries(equippedSetTiers).forEach(([setId, tiers]) => {
              const setInfo = gameData.sets.find(s => s.id === setId);
              if (setInfo) {
                  const tierCounts = Object.keys(tiers).map(Number).sort((a,b) => a - b);

                  tierCounts.forEach(tier => {
                      const piecesOfThisTier = tiers[tier];
                      const setBonusesForTier = setInfo.bonuses[tier];
                      if (setBonusesForTier) {
                          Object.entries(setBonusesForTier).forEach(([requiredCountStr, effect]) => {
                              const requiredCount = parseInt(requiredCountStr, 10);
                              if (piecesOfThisTier >= requiredCount) {
                                  player.activeSetBonuses.push(effect);
                              }
                          });
                      }
                  });
              }
          });

          // 4. Apply talent stats
          Object.entries(player.learnedTalents).forEach(([talentId, rank]) => {
              const talentData = gameData.talents.find(t => t.id === talentId);
              if (!talentData) return;

              if (talentData.effects) {
                talentData.effects.forEach(effect => {
                    const anyEffect = effect as any;
                    if (anyEffect.type === 'buff' && anyEffect.buffType === 'stat_modifier') {
                        anyEffect.statMods.forEach((mod: any) => {
                            const statKey = mod.stat as keyof Stats;
                            const statValue = player.stats[statKey];
                            if (typeof statValue === 'number') {
                                let value = 0;
                                if (Array.isArray(mod.value)) {
                                    value = mod.value[Math.min(rank - 1, mod.value.length - 1)] || 0;
                                } else {
                                    value = mod.value;
                                }

                                let conditionMet = true;
                                if ((mod as any).condition) {
                                    if ((mod as any).condition.requires_weapon_type) {
                                        const weapon = inventory.equipment.weapon;
                                        if (!weapon || weapon.type !== (mod as any).condition.requires_weapon_type) {
                                            conditionMet = false;
                                        }
                                    }
                                }

                                if (conditionMet) {
                                    if (mod.modifier === 'additive') {
                                        (player.stats[statKey] as number) = statValue + value;
                                    } else if (mod.modifier === 'multiplicative') {
                                        (player.stats[statKey] as number) = statValue * value;
                                    }
                                }
                            }
                        });
                    }
                });
              } else { // Fallback to old effect strings
                if (talentData.effets) {
                  talentData.effets.forEach(effectString => {
                      if (typeof effectString !== 'string') {
                          // This talent is using the new object format but under the old 'effets' key.
                          // The safeguard in getTalentEffectValue will log an error. Skip processing here.
                          return;
                      }
                      const value = getTalentEffectValue(effectString, rank);
                      if (effectString.includes('Armure') && typeof player.stats.Armure === 'number') {
                          player.stats.Armure += (player.stats.Armure * value) / 100;
                      } else if (effectString.includes('PV') && typeof player.stats.PV === 'number') {
                          player.stats.PV += (player.baseStats.PV * value) / 100;
                      } // ... and so on for other stats, always with type checks
                  });
                }
              }
          });

          // --- Final calculations and state updates ---
          // --- Stat Overrides from Talents ---
            Object.entries(player.learnedTalents).forEach(([talentId, rank]) => {
                const talentData = gameData.talents.find(t => t.id === talentId);
                if (talentData?.effects) {
                    talentData.effects.forEach((effect: any) => {
                        if (effect.type === 'stat_override') {
                            const statKey = effect.stat as keyof Stats;
                            (player.stats[statKey] as any) = effect.value;
                        }
                    });
                }
            });

          const newMaxHp = formulas.calculateMaxHP(player.level, player.stats);
          if (classe.ressource !== 'Rage') {
            const maxMana = formulas.calculateMaxMana(player.level, player.stats);
            player.resources.max = maxMana;
             if (player.resources.current > player.resources.max) {
                player.resources.current = player.resources.max;
            }
          } else {
             player.resources.max = 100;
          }
          
          if (options?.forceRestore || state.view !== 'COMBAT') {
            player.stats.PV = newMaxHp;
            player.shield = 0;
            if(state.player.resources.type !== 'Rage') {
              player.resources.current = player.resources.max;
            }
          } else {
              player.stats.PV = Math.round(Math.min(newMaxHp, newMaxHp * hpPercent));
          }
        });
      },

      equipItem: (itemId: string) => {
        const { inventory, player } = get();
        const itemIndex = inventory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const itemToEquip = inventory.items[itemIndex];

        if (itemToEquip.niveauMin > player.level) {
          console.log(`Niveau insuffisant pour équiper ${itemToEquip.name}. Requis: ${itemToEquip.niveauMin}, Actuel: ${player.level}`);
          // TODO: Ajouter un feedback pour l'utilisateur (ex: toast)
          return;
        }

        if (itemToEquip.type === 'quest') {
            console.log("Cannot equip quest items.");
            return;
        }

        set((state: GameState) => {
            state.inventory.items.splice(itemIndex, 1);
            let slot = itemToEquip.slot as keyof InventoryState['equipment'];

            if (slot === 'ring') {
                if (state.inventory.equipment.ring === null) {
                    slot = 'ring';
                } else if (state.inventory.equipment.ring2 === null) {
                    slot = 'ring2';
                } else {
                    slot = 'ring';
                }
            }

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

      buyItem: (itemId: string) => {
          const { inventory, gameData } = get();
          const itemToBuy = gameData.items.find(i => i.id === itemId);

          if (!itemToBuy) {
              console.error("Objet à acheter non trouvé dans gameData:", itemId);
              return false;
          }

          const price = getItemBuyPrice(itemToBuy);
          if (price <= 0 || inventory.gold < price) {
              return false;
          }

          const newItem: Item = { ...itemToBuy, id: uuidv4(), baseId: itemToBuy.id };

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

      learnRecipe: (recipeId: string) => {
        set((state: GameState) => {
            if (!state.player.learnedRecipes.includes(recipeId)) {
                state.player.learnedRecipes.push(recipeId);
            }
        });
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

      consumePotion: (potionType: PotionType) => {
          set((state: GameState) => {
              if (potionType === 'health') {
                 if (state.inventory.potions.health > 0) {
                    const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    let healAmount = Math.round(maxHp * 0.15);

                    const buffedStats = getModifiedStats(state.player.stats, [...state.player.activeBuffs, ...state.player.activeDebuffs], state.player.form);
                    healAmount *= (buffedStats.HealingMultiplier || 1);
                    healAmount *= (buffedStats.HealingReceivedMultiplier || 1);
                    healAmount = Math.round(healAmount);

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

      addFloatingText: (entityId, text, type) => {
        set(state => {
            const id = uuidv4();
            state.combat.floatingTexts.push({ id, entityId, text, type });
        });
      },

      removeFloatingText: (id: string) => {
        set(state => {
            state.combat.floatingTexts = state.combat.floatingTexts.filter(ft => ft.id !== id);
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

            // --- Amélioration des récompenses du coffre de donjon ---
            const chestGold = (currentDungeon?.palier ?? 1) * 150 * worldTier;
            const chestItems: Item[] = [];

            // Garantit 3 objets dans le coffre
            for (let i = 0; i < 3; i++) {
                const possibleItemTemplates = gameData.items.filter(item =>
                    item.rarity !== "Légendaire" && item.rarity !== "Unique" && !item.set && item.slot !== 'potion' &&
                    (item.tagsClasse?.includes('common') || (player.classeId && player.classeId))
                );

                if (possibleItemTemplates.length > 0) {
                    const baseItemTemplate = possibleItemTemplates[Math.floor(Math.random() * possibleItemTemplates.length)];
                    const { id, niveauMin, rarity, affixes, ...baseItemProps } = baseItemTemplate;
                    const itemLevel = currentDungeon?.palier ?? player.level;

                    let bonusRarity: Rareté = "Rare";
                    if (i === 0) { // First item is guaranteed Rare or better
                        const roll = Math.random();
                        if (roll < 0.1) bonusRarity = "Légendaire";
                        else if (roll < 0.3) bonusRarity = "Épique";
                    } else {
                        const roll = Math.random();
                        if (roll < 0.02) bonusRarity = "Légendaire";
                        else if (roll < 0.1) bonusRarity = "Épique";
                        else if (roll < 0.4) bonusRarity = "Rare";
                        else bonusRarity = "Commun";
                    }

                    const chestItem = generateProceduralItem(baseItemProps, itemLevel, bonusRarity, gameData.affixes, baseItemTemplate.id, state.currentDungeon || undefined);
                    if (chestItem) {
                        chestItems.push(chestItem);
                    }
                }
            }

            const chestRewards = {
                gold: chestGold,
                items: chestItems,
            };

            const summary: DungeonCompletionSummary = {
                killCount: combat.killCount,
                goldGained: combat.goldGained,
                xpGained: combat.xpGained,
                itemsGained: [...combat.dungeonRunItems],
                chestRewards: chestRewards,
                recipesGained: [],
                combatLog: combat.log,
            };

            // --- Bonus Recipe Drop from Chest ---
            const dungeonTier = currentDungeon?.palier ?? 1;
            if (Math.random() < 0.2) { // 20% chance for a bonus recipe
                const possibleRecipes = gameData.enchantments.filter(e =>
                    e.tier && e.tier <= dungeonTier &&
                    e.source && (e.source.includes('drop') || e.source.includes('rare_drop')) &&
                    !player.learnedRecipes.includes(e.id)
                );
                if (possibleRecipes.length > 0) {
                    const recipeToLearn = possibleRecipes[Math.floor(Math.random() * possibleRecipes.length)];
                    player.learnedRecipes.push(recipeToLearn.id);
                    summary.recipesGained?.push(recipeToLearn);
                }
            }

            state.dungeonCompletionSummary = summary;

            inventory.gold += summary.goldGained + (summary.chestRewards?.gold ?? 0);
            inventory.items.push(...summary.itemsGained);
            if (summary.chestRewards) {
                inventory.items.push(...summary.chestRewards.items);
            }

            if (currentDungeon) {
                const dungeonId = currentDungeon.id;
                const newClearCount = (player.completedDungeons[dungeonId] || 0) + 1;
                player.completedDungeons[dungeonId] = newClearCount;

                if (currentDungeon.factionId) {
                    const repData = player.reputation[currentDungeon.factionId] || { value: 0, claimedRewards: [] };
                    repData.value += 250;
                    player.reputation[currentDungeon.factionId] = repData;
                }

                // Check for 'nettoyage' and 'defi' quest completion
                const completedQuestsThisDungeon: string[] = [];
                const dungeonTime = state.dungeonStartTime ? Date.now() - state.dungeonStartTime : Infinity;

                state.activeQuests.forEach(activeQuest => {
                    const { quete } = activeQuest;
                    if (quete.type === 'nettoyage' && quete.requirements.dungeonId === dungeonId && quete.requirements.clearCount) {
                        if (newClearCount >= quete.requirements.clearCount) {
                            player.xp += quete.rewards.xp;
                            inventory.gold += quete.rewards.gold;
                            player.completedQuests.push(quete.id);
                            completedQuestsThisDungeon.push(quete.id);
                            combat.log.push({ message: `Quête terminée: ${quete.name}`, type: 'quest', timestamp: Date.now() });
                        }
                    } else if (quete.type === 'defi' && quete.requirements.dungeonId === dungeonId && quete.requirements.timeLimit) {
                        if (dungeonTime <= quete.requirements.timeLimit * 1000) {
                            player.xp += quete.rewards.xp;
                            inventory.gold += quete.rewards.gold;
                            player.completedQuests.push(quete.id);
                            completedQuestsThisDungeon.push(quete.id);
                            combat.log.push({ message: `Défi réussi: ${quete.name}`, type: 'quest', timestamp: Date.now() });
                        }
                    } else if (quete.type === 'collecte' && quete.requirements.dungeonId === dungeonId) {
                        const requiredCount = quete.requirements.itemCount || 0;
                        const ownedCount = inventory.items.filter(i => i.baseId === quete.requirements.itemId).length;
                        if (ownedCount >= requiredCount) {
                             player.xp += quete.rewards.xp;
                            inventory.gold += quete.rewards.gold;
                            player.completedQuests.push(quete.id);
                            completedQuestsThisDungeon.push(quete.id);
                            combat.log.push({ message: `Quête terminée: ${quete.name}`, type: 'quest', timestamp: Date.now() });

                            let itemsToRemove = requiredCount;
                            inventory.items = inventory.items.filter(item => {
                                if (item.baseId === quete.requirements.itemId && itemsToRemove > 0) {
                                    itemsToRemove--;
                                    return false;
                                }
                                return true;
                            });
                        }
                    }
                });

                if (completedQuestsThisDungeon.length > 0) {
                    state.activeQuests = state.activeQuests.filter(aq => !completedQuestsThisDungeon.includes(aq.quete.id));
                }
            }

            state.combat.dungeonRunItems = [];
            state.combat.goldGained = 0;
            state.combat.xpGained = 0;
            state.dungeonStartTime = null;
            state.view = 'DUNGEON_COMPLETED';
            if (gameLoop) clearInterval(gameLoop);
        });
        get().checkAndApplyLevelUp();
      },

      enterDungeon: (dungeonId: string) => {
        console.log("Entering dungeon with id:", dungeonId);
        const { gameData, isHeroicMode } = get();
        const finalDungeonId = isHeroicMode ? `${dungeonId}_heroic` : dungeonId;
        const dungeon = gameData.dungeons.find(d => d.id === finalDungeonId);

        if (dungeon) {
          set((state: GameState) => {
            state.view = 'COMBAT';
            state.currentDungeon = dungeon;
            state.dungeonState = {
                equipmentDropsPending: Math.floor(Math.random() * 2) + 2, // 2 or 3
                monstersRemainingInDungeon: dungeon.killTarget,
            };
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

      // ====================================================================================
      // NOTE: Monster abilities are not yet implemented. Currently, monsters only
      // perform basic auto-attacks. A future system could involve:
      // - Adding an `abilities` array to monster definitions in `monsters.json`.
      // - Creating a monster AI loop within `gameTick` that decides when a monster
      //   should use an ability instead of a basic attack.
      // - Expanding the `enemyAttacks` function to process these abilities, likely
      //   re-using parts of the `skillProcessor` logic for effects.
      // ====================================================================================
      startCombat: () => {
        const { currentDungeon, gameData, worldTier } = get();
        if (!currentDungeon) return;

        const possibleMonsters = gameData.monsters.filter(m => currentDungeon.monsters.includes(m.id) && !m.isBoss);
        const monsterCount = Math.floor(Math.random() * 3) + 1;
        const newEnemies: CombatEnemy[] = [];

        for(let i=0; i<monsterCount; i++) {
          const randomMonsterTemplate = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
          if (randomMonsterTemplate) {
            const monsterIndexInDungeon = currentDungeon.monsters.indexOf(randomMonsterTemplate.id);
            const biomeNumber = parseInt(currentDungeon.id.split('_')[1], 10);
            const image = `/images/monstre${monsterIndexInDungeon + 1}_biome${biomeNumber}.png`;

            const monsterInstance: CombatEnemy = {
              ...JSON.parse(JSON.stringify(randomMonsterTemplate)),
              id: uuidv4(),
              templateId: randomMonsterTemplate.id,
              originalId: randomMonsterTemplate.id,
              image: image,
              initialHp: randomMonsterTemplate.stats.PV,
              attackProgress: Math.random(),
              activeDebuffs: [],
              activeBuffs: [],
              stunDuration: 0,
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

            // Dynamically add elemental damage based on monster family and dungeon tier
            const familyToElement: Record<string, Theme> = {
                'Elemental': currentDungeon.biome,
                'Dragonkin': currentDungeon.biome,
                'Demon': 'fire',
            };

            const elementType = familyToElement[monsterInstance.famille];
            if (elementType) {
                const heroicMultiplier = get().isHeroicMode ? 1.5 : 1;
                const bossMultiplier = monsterInstance.isBoss ? 1.5 : 1;
                const baseDamage = (currentDungeon.palier * 2);

                const min = Math.round(baseDamage * 0.8 * heroicMultiplier * bossMultiplier);
                const max = Math.round(baseDamage * 1.2 * heroicMultiplier * bossMultiplier);

                monsterInstance.elementalDamage = {
                    type: elementType,
                    min: min,
                    max: max,
                };
            }

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
          const { view, combat, bossEncounter } = get();

          if(view !== 'COMBAT' || !combat.enemies || combat.enemies.length === 0 || bossEncounter) {
            if(gameLoop && view !== 'COMBAT') clearInterval(gameLoop);
            return;
          }

          const deadEnemyIdsFromActions: string[] = [];

          set((state: GameState) => {
              const livingEnemies = state.combat.enemies.filter(e => e.stats.PV > 0);
              if (livingEnemies.length === 0) {
                  state.combat.playerAttackProgress = 0;
                  return;
              }

              if (state.player.stunDuration > 0) {
                state.player.stunDuration -= delta;
              } else if (state.combat.autoAttack) {
                  state.combat.playerAttackProgress += delta / state.combat.playerAttackInterval;
                  if (state.combat.playerAttackProgress > 1) {
                      state.combat.playerAttackProgress = 1;
                  }
              }

              if (state.player.invulnerabilityDuration > 0) {
                state.player.invulnerabilityDuration -= delta;
              }

              if (state.player.stats.HPRegenPercent && state.player.stats.HPRegenPercent > 0) {
                const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                const regenAmount = maxHp * (state.player.stats.HPRegenPercent / 100) * (delta / 1000); // per second
                state.player.stats.PV = Math.min(maxHp, state.player.stats.PV + regenAmount);
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

              for (const monsterSkillId in state.combat.monsterSkillCooldowns) {
                  state.combat.monsterSkillCooldowns[monsterSkillId] -= delta;
                  if (state.combat.monsterSkillCooldowns[monsterSkillId] <= 0) {
                      delete state.combat.monsterSkillCooldowns[monsterSkillId];
                  }
              }

              const stealthExpired = state.player.activeBuffs.some(b => b.id === 'stealth' && b.duration <= delta);
              let shouldRecalculate = false;

              state.player.activeBuffs = state.player.activeBuffs.filter(buff => {
                  buff.duration -= delta;
                  if (buff.duration <= 0) {
                      shouldRecalculate = true;
                      return false;
                  }

                  if (buff.healingPerTick && buff.nextTickIn !== undefined && buff.tickInterval !== undefined) {
                      buff.nextTickIn -= delta;
                      if (buff.nextTickIn <= 0) {
                        const buffedStats = getModifiedStats(state.player.stats, [...state.player.activeBuffs, ...state.player.activeDebuffs], state.player.form);
                        const healAmount = buff.healingPerTick * (buffedStats.HealingReceivedMultiplier || 1);
                        const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                        const oldHp = state.player.stats.PV;
                        state.player.stats.PV = Math.min(maxHp, state.player.stats.PV + healAmount);
                        const actualHeal = Math.round(state.player.stats.PV - oldHp);
                        if (actualHeal > 0) {
                            state.combat.log.push({ message: `Votre ${buff.name} vous rend ${actualHeal} PV.`, type: 'heal', timestamp: Date.now() });
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

              if (shouldRecalculate) {
                get().recalculateStats();
              }

              state.combat.enemies.forEach(enemy => {
                  if(enemy.stats.PV > 0) {
                    if (enemy.stunDuration > 0) {
                        enemy.stunDuration -= delta;
                    } else {
                        const modifiedStats = getModifiedStats(enemy.stats, enemy.activeDebuffs || []);
                        const attackInterval = modifiedStats.Vitesse * 1000;
                        if (enemy.attackProgress < 1) {
                            enemy.attackProgress += delta / attackInterval;
                        } else {
                            enemy.attackProgress = 1;
                        }
                    }

                    enemy.activeDebuffs = enemy.activeDebuffs?.filter(debuff => {
                        debuff.duration -= delta;
                        if (debuff.duration <= 0) return false;

                        if (debuff.damagePerTick && debuff.nextTickIn !== undefined && debuff.tickInterval !== undefined) {
                            debuff.nextTickIn -= delta;
                            if (debuff.nextTickIn <= 0) {
                                enemy.stats.PV -= debuff.damagePerTick;
                                state.combat.log.push({ message: `${enemy.nom} subit ${debuff.damagePerTick} dégâts de ${debuff.name}.`, type: 'enemy_attack', timestamp: Date.now() });
                                debuff.nextTickIn = debuff.tickInterval;
                                if (enemy.stats.PV <= 0) {
                                    deadEnemyIdsFromActions.push(enemy.id);
                                }
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

          set((state: GameState) => {
            state.combat.pendingActions = state.combat.pendingActions?.filter(action => {
                if (action.type === 'damage_wave') {
                    action.nextWaveIn -= delta;
                    if (action.nextWaveIn <= 0) {
                        const target = state.combat.enemies.find(e => e.id === action.targetId);
                        if (target && target.stats.PV > 0) {
                            const skill = state.gameData.skills.find(s => s.id === action.skillId);
                            const damageEffect = skill?.effects?.find(e => (e as any).type === 'multi_strike');
                            const damageType = (damageEffect as any)?.damage?.damageType || 'arcane';
                            const damage = formulas.calculateSpellDamage(action.damagePerWave, formulas.calculateSpellPower(state.player.stats), state.player.stats, damageType);
                            const isCrit = formulas.isCriticalHit(state.player.stats.CritPct, state.player.stats.Precision, target.stats, state.player, state.gameData);
                            const finalDamage = isCrit ? damage * (state.player.stats.CritDmg / 100) : damage;
                            const dr = formulas.calculateArmorDR(target.stats.Armure, state.player.level);
                            const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                            target.stats.PV -= mitigatedDamage;
                            const waveNum = skill?.effets ? getTalentEffectValue(skill.effets[0], state.player.learnedSkills[skill.id]) - action.wavesLeft + 1 : 0;
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
          get().checkAndApplyLevelUp();
      },

      playerAttack: function(targetId: string, isCleave = false, skillId?: string) {
        const events: { entityId: string, text: string, type: FloatingTextType }[] = [];
        set((state: GameState) => {
            const { player, combat, gameData } = state;
            if (combat.isStealthed) {
                combat.isStealthed = false;
                events.push({ entityId: player.id, text: "Camouflage rompu", type: 'info'});
                combat.log.push({ message: "Vous sortez de l'ombre.", type: 'info', timestamp: Date.now() });
            }
            const target = combat.enemies.find(e => e.id === targetId);
            if (!target || target.stats.PV <= 0) return;

            const buffedPlayerStats = getModifiedStats(player.stats, [...player.activeBuffs, ...player.activeDebuffs], player.form);
            let debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs);

            let isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats, player, gameData);
            if (player.nextAttackIsGuaranteedCrit) {
                isCrit = true;
                player.nextAttackIsGuaranteedCrit = false;
            }

            const damageResult = formulas.calculatePlayerAttackDamage(buffedPlayerStats);
            let totalDamage = 0;
            const damageDetails: string[] = [];

            // --- Physical Damage ---
            let physicalDamage = damageResult.physical;
            if (isCrit) physicalDamage *= (buffedPlayerStats.CritDmg / 100);
            physicalDamage *= (buffedPlayerStats.DamageMultiplier || 1);

            const dr = formulas.calculateArmorDR(debuffedTargetStats.Armure, player.level);
            const mitigatedPhysicalDamage = Math.round(physicalDamage * (isCleave ? 0.5 : 1) * (1 - dr));
            
            if (mitigatedPhysicalDamage > 0) {
              target.stats.PV -= mitigatedPhysicalDamage;
              totalDamage += mitigatedPhysicalDamage;
              damageDetails.push(`${mitigatedPhysicalDamage} physiques`);
              events.push({ entityId: target.id, text: `-${mitigatedPhysicalDamage}`, type: isCrit ? 'crit' : 'damage' });
            }

            // --- Elemental Damage ---
            damageResult.elementals.forEach(elem => {
                let elementalDamage = elem.value;
                if (isCrit) elementalDamage *= (buffedPlayerStats.CritDmg / 100);

                const res = debuffedTargetStats.ResElems?.[elem.type] || 0;
                const elemDR = formulas.calculateResistanceDR(res, player.level);
                const mitigatedElemDmg = Math.round(elementalDamage * (1 - elemDR));

                if (mitigatedElemDmg > 0) {
                    target.stats.PV -= mitigatedElemDmg;
                    totalDamage += mitigatedElemDmg;
                    damageDetails.push(`${mitigatedElemDmg} ${elem.type}`);
                    events.push({ entityId: target.id, text: `-${mitigatedElemDmg}`, type: 'damage' });
                }
            });

            applyPoisonProc(state, target, events);

            const damageDetailsString = damageDetails.length > 0 ? ` (${damageDetails.join(', ')})` : '';
            const attackMsg = `Vous frappez ${target.nom} pour ${totalDamage} points de dégâts${damageDetailsString}.`;
            const critMsg = `CRITIQUE ! Vous frappez ${target.nom} pour ${totalDamage} points de dégâts${damageDetailsString}.`;
            const cleaveMsg = `Votre enchaînement touche ${target.nom} pour ${totalDamage} points de dégâts${damageDetailsString}.`;

            if(!isCleave) {
                state.combat.log.push({ message: isCrit ? critMsg : attackMsg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                state.combat.playerAttackProgress = 0;
            } else {
                  state.combat.log.push({ message: cleaveMsg, type: 'player_attack', timestamp: Date.now() });
            }

            if(state.player.resources.type === 'Rage' && !isCleave) {
              let rageGained = 5;
              const criDeGuerreRank = state.player.learnedTalents['berserker_battle_cry'] || 0;
              if (criDeGuerreRank > 0) {
                  const talent = state.gameData.talents.find(t => t.id === 'berserker_battle_cry');
                  if(talent && talent.effets) rageGained += getTalentEffectValue(talent.effets[0], criDeGuerreRank);
              }
              state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + rageGained);
            }

            const tempeteRank = player.learnedTalents['berserker_fureur_ultime'];
            if (tempeteRank && tempeteRank > 0) {
                if (Math.random() < 0.1) {
                    const buffId = 'tempete_implacable_buff';
                    const existingBuffIndex = player.activeBuffs.findIndex(b => b.id === buffId);
                    if (existingBuffIndex > -1) player.activeBuffs.splice(existingBuffIndex, 1);
                    player.activeBuffs.push({ id: buffId, name: 'Tempête Implacable', duration: 10000, statMods: [{ stat: 'Vitesse', modifier: 'multiplicative', value: 0.01 }] });
                    events.push({ entityId: player.id, text: "Tempête Implacable", type: 'buff' });
                    combat.log.push({ message: `Le talent Tempête Implacable s'active ! Votre vitesse d'attaque est décuplée !`, type: 'talent_proc', timestamp: Date.now() });
                }
            }
        });

        events.forEach(ft => get().addFloatingText(ft.entityId, ft.text, ft.type));
        get().recalculateStats();

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

      activateSkill: (skillId: string) => {
        let deadEnemyIds: string[] = [];
        let floatingTexts: { entityId: string, text: string, type: FloatingTextType }[] = [];
        set((state: GameState) => {
            const result = processSkill(state, skillId, get, get().applySpecialEffect);
            deadEnemyIds = result.deadEnemyIds;
            floatingTexts = result.floatingTexts;
        });

        floatingTexts.forEach(ft => get().addFloatingText(ft.entityId, ft.text, ft.type));

        if (deadEnemyIds.length > 0) {
            deadEnemyIds.forEach(enemyId => {
                const enemy = get().combat.enemies.find(e => e.id === enemyId);
                if (enemy) {
                    get().handleEnemyDeath(enemy, skillId);
                }
            });
        }
      },

      enemyAttacks: () => {
        const { combat, player } = get();
        const events: { entityId: string; text: string; type: FloatingTextType }[] = [];

        if (combat.isStealthed) {
            set((state: GameState) => {
                state.combat.enemies.forEach(enemy => {
                    if (enemy.attackProgress >= 1) {
                        enemy.attackProgress = 0;
                    }
                });
            });
            return;
        }

        const attackingEnemies = combat.enemies.filter(e => e.attackProgress >= 1 && e.stats.PV > 0);

        attackingEnemies.forEach(enemy => {
            if (player.stats.PV <= 0) return;

            let abilityUsed = false;
            // Monster ability logic would go here, potentially adding events to the `events` array.

            if (abilityUsed) {
                return;
            }

            const buffedPlayerStats = getModifiedStats(player.stats, [...player.activeBuffs, ...player.activeDebuffs], player.form);
            const didDodge = Math.random() * 100 < buffedPlayerStats.Esquive;

            if (didDodge) {
                events.push({ entityId: player.id, text: 'Esquive', type: 'dodge' });
                set((state: GameState) => {
                    state.combat.log.push({ message: `Vous esquivez l'attaque de ${enemy.nom}.`, type: 'info', timestamp: Date.now() });
                    const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                    if (enemyInState) enemyInState.attackProgress = 0;
                });
                get().applyTalentTrigger('on_dodge', { attackerId: enemy.id });
                return;
            }

            const damageResult = formulas.calculateAttackDamage(enemy.stats, enemy.elementalDamage);

            const playerDr = formulas.calculateArmorDR(buffedPlayerStats.Armure, enemy.level);
            const mitigatedPhysicalDamage = Math.round(damageResult.physical * (1 - playerDr));

            let mitigatedElementalDamage = 0;
            let elementalDamageType: string | undefined = undefined;
            if (damageResult.elemental) {
                const playerRes = buffedPlayerStats.ResElems?.[damageResult.elemental.type] ?? 0;
                const elementalDR = formulas.calculateResistanceDR(playerRes, enemy.level);
                mitigatedElementalDamage = Math.round(damageResult.elemental.value * (1 - elementalDR));
                elementalDamageType = damageResult.elemental.type;
            }

            let totalDamage = mitigatedPhysicalDamage + mitigatedElementalDamage;
            totalDamage *= (buffedPlayerStats.DamageReductionMultiplier || 1);
            totalDamage = Math.round(totalDamage);

            set((state: GameState) => {
                const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                if (!enemyInState || enemyInState.stats.PV <= 0) return;

                if (state.player.invulnerabilityDuration > 0) {
                    events.push({ entityId: player.id, text: 'Invulnérable!', type: 'info' });
                    state.combat.log.push({ message: `L'attaque de ${enemy.nom} est bloquée par votre invulnérabilité.`, type: 'shield', timestamp: Date.now() });
                    enemyInState.attackProgress = 0;
                    return;
                }

                let damageToApply = totalDamage;

                if (state.player.shield > 0) {
                    const shieldAbsorption = Math.min(state.player.shield, damageToApply);
                    events.push({ entityId: player.id, text: `-${shieldAbsorption}`, type: 'shield' });
                    state.player.shield -= shieldAbsorption;
                    damageToApply -= shieldAbsorption;
                    state.combat.log.push({ message: `L'attaque de ${enemy.nom} est absorbée par votre bouclier pour ${shieldAbsorption} points.`, type: 'shield', timestamp: Date.now() });
                }

                if (damageToApply > 0) {
                     if (state.player.stats.PV - damageToApply <= 0) {
                        // Death logic here, potentially preventing damage and not adding floating text
                     }

                    if (damageToApply > 0) {
                        events.push({ entityId: player.id, text: `-${damageToApply}`, type: 'damage' });
                        state.player.stats.PV -= damageToApply;
                        let damageMessage = `${enemy.nom} vous inflige ${damageToApply} points de dégâts`;
                        if (mitigatedElementalDamage > 0 && elementalDamageType) {
                             damageMessage += ` (${mitigatedPhysicalDamage} physiques, ${mitigatedElementalDamage} de ${elementalDamageType})`;
                        }
                        damageMessage += '.';
                        state.combat.log.push({ message: damageMessage, type: 'enemy_attack', timestamp: Date.now() });
                    }
                }

                if (state.player.resources.type === 'Rage') {
                    state.player.resources.current = Math.min(state.player.resources.max, state.player.resources.current + 10);
                }
                enemyInState.attackProgress = 0;
            });
        });

        events.forEach(ft => get().addFloatingText(ft.entityId, ft.text, ft.type));

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
            const xpGained = Math.round((enemy.level * 10) * (1 + (currentDungeon ? currentDungeon.palier * 0.05 : 0)));

            state.combat.log.push({ message: `You defeated ${enemy.nom}!`, type: 'info', timestamp: Date.now() });
            state.combat.log.push({ message: `You find ${goldDrop} gold.`, type: 'loot', timestamp: Date.now() });
            state.combat.goldGained += goldDrop;

            state.player.xp += xpGained;
            state.combat.xpGained += xpGained;
            state.combat.log.push({ message: `You gain ${xpGained} experience.`, type: 'info', timestamp: Date.now() });

            if (state.dungeonState && state.dungeonState.equipmentDropsPending > 0 && state.dungeonState.monstersRemainingInDungeon > 0) {
                const dropChance = state.dungeonState.equipmentDropsPending / state.dungeonState.monstersRemainingInDungeon;
                if (Math.random() < dropChance) {
                    const equipmentDrop = generateEquipmentLoot(enemy, gameData, state.player.classeId, worldTier, state.currentDungeon || undefined, enemy.famille);
                    if (equipmentDrop) {
                        state.combat.dungeonRunItems.push(equipmentDrop);
                        state.combat.log.push({ message: ``, type: 'loot', timestamp: Date.now(), item: equipmentDrop });
                        if(state.dungeonState) state.dungeonState.equipmentDropsPending--;
                    }
                }
            }
            if(state.dungeonState) {
                state.dungeonState.monstersRemainingInDungeon--;
            }

            // --- Quest Item Drop Logic ---
            activeQuests.forEach((activeQuest) => {
              const { quete } = activeQuest;
              if (quete.type === 'collecte' && quete.requirements.itemId && enemy.questItemId === quete.requirements.itemId) {
                  if ((activeQuest.progress || 0) < (quete.requirements.itemCount || 0)) {
                      const questItem = gameData.items.find(item => item.id === quete.requirements.itemId);
                      if (questItem && Math.random() < 0.3) { // 30% drop chance for quest items
                          const newQuestItem = { ...questItem, id: uuidv4() };
                          state.combat.dungeonRunItems.push(newQuestItem);
                          state.combat.log.push({ message: ``, type: 'loot', timestamp: Date.now(), item: newQuestItem });
                      }
                  }
              }
            });

            // --- Component Loot Drop Logic ---
            if (enemy.componentLoot) {
              enemy.componentLoot.forEach(loot => {
                if (Math.random() < loot.chance) {
                  const materialId = loot.id;
                  const amount = loot.quantity;
                  state.inventory.craftingMaterials[materialId] = (state.inventory.craftingMaterials[materialId] || 0) + amount;
                  const material = state.gameData.components.find(c => c.id === materialId);
                  state.combat.log.push({ message: `You find ${amount} x ${material ? material.name : materialId}.`, type: 'loot', timestamp: Date.now() });
                }
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

                  // Remove quest items if it's a 'collecte' quest
                  if (quete.type === 'collecte' && req.itemId && req.itemCount) {
                      let itemsToRemove = req.itemCount;
                      state.inventory.items = state.inventory.items.filter(item => {
                          if (item.baseId === req.itemId && itemsToRemove > 0) {
                              itemsToRemove--;
                              return false; // Remove this item
                          }
                          return true; // Keep this item
                      });
                  }

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

          get().checkAndApplyLevelUp();
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
                                templateId: bossTemplate.id,
                                originalId: bossTemplate.id,
                                initialHp: bossTemplate.stats.PV,
                                attackProgress: 0,
                                activeDebuffs: [],
                                stunDuration: 0,
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

      applyTalentTrigger: (trigger, context) => {
        set((state: GameState) => {
            const { player, gameData, combat } = state;
            Object.entries(player.learnedTalents).forEach(([talentId, rank]) => {
                const talent = gameData.talents.find(t => t.id === talentId);
                if (!talent || !talent.triggeredEffects) return;

                talent.triggeredEffects.forEach(triggeredEffect => {
                    if (triggeredEffect.trigger === trigger) {
                        // Check for conditions
                        let conditionsMet = true;
                        if (triggeredEffect.conditions) {
                            if (triggeredEffect.conditions.skill_damage_type && context?.skill?.effects) {
                                const skillDamageType = (context.skill.effects[0] as any).damageType;
                                if (skillDamageType !== triggeredEffect.conditions.skill_damage_type) {
                                    conditionsMet = false;
                                }
                            }
                        }

                        if (conditionsMet && Math.random() < getRankValue(triggeredEffect.chance, rank)) {
                            triggeredEffect.effects.forEach(effect => {
                                const anyEffect = effect as any;
                                if (anyEffect.type === 'buff' && anyEffect.buffType === 'stat_modifier') {
                                    const value = getRankValue(anyEffect.statMods[0].value, rank);
                                    const newStatMod = { ...anyEffect.statMods[0], value: value };
                                    player.activeBuffs.push({ id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration * 1000, statMods: [newStatMod] });
                                    combat.log.push({ message: `Le talent ${talent.nom} s'active !`, type: 'talent_proc', timestamp: Date.now() });
                                } else if (anyEffect.type === 'apply_buff') {
                                    const buffData = anyEffect.buff;
                                    const existingBuff = player.activeBuffs.find(b => b.id === buffData.id);
                                    if (existingBuff && buffData.is_stacking) {
                                        const max_stacks = getRankValue(buffData.max_stacks, rank);
                                        existingBuff.stacks = Math.min(max_stacks, (existingBuff.stacks || 1) + 1);
                                        existingBuff.duration = buffData.duration; // Refresh duration
                                        combat.log.push({ message: `${buffData.name} (x${existingBuff.stacks})`, type: 'talent_proc', timestamp: Date.now() });
                                    } else if (!existingBuff) {
                                        player.activeBuffs.push({ ...buffData, stacks: 1, duration: buffData.duration });
                                        combat.log.push({ message: `Vous gagnez ${buffData.name}.`, type: 'talent_proc', timestamp: Date.now() });
                                    }
                                } else if (anyEffect.type === 'apply_debuff' && context?.targetId) {
                                    const target = combat.enemies.find(e => e.id === context.targetId);
                                    if (target) {
                                        const debuffData = anyEffect.debuff;
                                        if (debuffData.debuffType === 'dot') {
                                            const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
                                            let totalDamage = 0;
                                            if (debuffData.totalDamage.source === 'weapon') {
                                                const baseDmg = formulas.calculatePhysicalDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                                                totalDamage = baseDmg * getRankValue(debuffData.totalDamage.multiplier, rank);
                                            } else if (debuffData.totalDamage.source === 'attack_power') {
                                                totalDamage = formulas.calculateAttackPower(buffedPlayerStats) * getRankValue(debuffData.totalDamage.multiplier, rank);
                                            }
                                            const damagePerTick = Math.round(totalDamage / debuffData.duration);
                                            target.activeDebuffs.push({ id: debuffData.id, name: debuffData.name, duration: debuffData.duration * 1000, damagePerTick: damagePerTick, tickInterval: 1000, nextTickIn: 1000, isDebuff: true, damageType: debuffData.damageType });
                                            combat.log.push({ message: `Le talent ${talent.nom} s'active sur ${target.nom} !`, type: 'talent_proc', timestamp: Date.now() });
                                        } else if (debuffData.debuffType === 'stat_modifier') {
                                            const newDebuff: Debuff = { id: debuffData.id, name: debuffData.name, duration: debuffData.duration * 1000, statMods: debuffData.statMods, isDebuff: true };
                                            target.activeDebuffs.push(newDebuff);
                                            combat.log.push({ message: `Le talent ${talent.nom} s'active sur ${target.nom} !`, type: 'talent_proc', timestamp: Date.now() });
                                        }
                                    }
                                } else if (anyEffect.type === 'riposte' && context?.attackerId) {
                                    combat.log.push({ message: `Le talent ${talent.nom} s'active ! Vous ripostez !`, type: 'talent_proc', timestamp: Date.now() });
                                    get().playerAttack(context.attackerId, false);
                                } else if (anyEffect.type === 'reduce_cooldowns') {
                                    if (anyEffect.reset) {
                                        for (const skillId in combat.skillCooldowns) {
                                            delete combat.skillCooldowns[skillId];
                                        }
                                        combat.log.push({ message: `Le talent ${talent.nom} s'active et réinitialise vos temps de recharge !`, type: 'talent_proc', timestamp: Date.now() });
                                    } else {
                                        const reduction = getRankValue(anyEffect.value, rank);
                                        for (const skillId in combat.skillCooldowns) {
                                            combat.skillCooldowns[skillId] = Math.max(0, combat.skillCooldowns[skillId] - reduction);
                                        }
                                        combat.log.push({ message: `Le talent ${talent.nom} s'active et réduit vos temps de recharge !`, type: 'talent_proc', timestamp: Date.now() });
                                    }
                                }
                            });
                        }
                    }
                });
            });
        });
      },

      applySpecialEffect: (trigger, context) => {
        set((state: GameState) => {
            if (trigger === 'ON_CRITICAL_HIT') {
                const danseDeLombreRank = state.player.learnedTalents['rogue_assassinat_ultime'];
                if (danseDeLombreRank && danseDeLombreRank > 0) {
                    state.combat.isStealthed = true;
                    state.player.nextAttackIsGuaranteedCrit = true;
                    state.combat.log.push({ message: `Danse de l'Ombre vous camoufle et garantit un coup critique.`, type: 'talent_proc', timestamp: Date.now() });
                }
            }

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
                                    name: 'Saignement (Objet)',
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
