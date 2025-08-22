import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Dungeon, Monstre, Item, Talent, Skill, Stats, PlayerState, InventoryState, CombatLogEntry, CombatState, GameData, Quete, PlayerClassId, ResourceType, Rareté, CombatEnemy, ItemSet, PotionType, Recipe, Theme, Affixe, Enchantment, Buff, Debuff } from '@/lib/types';
import { DungeonCompletionSummary } from '@/data/schemas';
import * as formulas from '@/core/formulas';
import { generateProceduralItem } from '@/core/itemGenerator';
import { v4 as uuidv4 } from 'uuid';
import { AFFIX_TO_THEME } from '@/lib/constants';

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
    activeSetBonuses: [],
    completedDungeons: {},
    completedQuests: [],
    shield: 0,
    invulnerabilityDuration: 0,
    stunDuration: 0,
    form: null,
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
    goldGained: 0,
    xpGained: 0,
};

interface GameState {
  isInitialized: boolean;
  rehydrateComplete: boolean;
  lastPlayed: number | null;
  view: 'MAIN' | 'COMBAT' | 'DUNGEON_COMPLETED';
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

  craftItem: (recipeId: string) => void;
  setHeroicMode: (isHeroic: boolean) => void;
  setTownView: (view: 'TOWN' | 'CRAFTING') => void;
  setWorldTier: (tier: number) => void;
  setBossEncounter: (monster: Monstre | null) => void; // NOUVEAU: Action pour gérer l'alerte
  setProposedQuests: (quests: Quete[] | null) => void;
  checkAndApplyLevelUp: () => void;
  initializeGameData: (data: Partial<GameData>) => void;
  setPlayerClass: (classId: PlayerClassId) => void;
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
  applyTalentTrigger: (trigger: 'on_dodge') => void;
      applySpecialEffect: (trigger: string, context: { targetId: string, isCrit: boolean }) => void;
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
    gameData.affixes
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
      return { ...specificItem, id: uuidv4() };
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
  const newItem = generateProceduralItem(baseItemProps, itemLevel, chosenRarity, gameData.affixes, dungeon);

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

export const STAT_WEIGHTS: Record<PlayerClassId, Partial<Record<StatWeightKeys, number>> & { BonusDmg?: Partial<Record<Theme, number>> }> = {
    berserker: { Force: 2, AttMin: 1.2, AttMax: 1.2, CritPct: 1, CritDmg: 0.8, Armure: 0.6, PV: 0.8, BonusDmg: { shadow: 1, fire: 1, ice: 1, nature: 1 } },
    mage: { Intelligence: 2, CritPct: 1.2, CritDmg: 1, Vitesse: 1, Esprit: 0.7, PV: 0.5, BonusDmg: { shadow: 1.5, fire: 1.5, ice: 1.5, nature: 1.5 } },
    rogue: { Dexterite: 2, Vitesse: 1.5, CritPct: 1.5, CritDmg: 1.2, AttMin: 1, AttMax: 1, BonusDmg: { shadow: 1, fire: 1, ice: 1, nature: 1 } },
    cleric: { Esprit: 2, Intelligence: 1.5, PV: 1, Armure: 0.8, CritPct: 0.7, BonusDmg: { shadow: 1.2, fire: 1.2, ice: 1.2, nature: 1.2 } },
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
            if (key === 'BonusDmg' || key === 'ResElems') return;
            const statKey = key as StatWeightKeys;
            const weight = weights[statKey] || 0.1;
            if (typeof value === 'number') {
                score += value * weight;
            }
        });

        if (item.stats.BonusDmg && weights.BonusDmg) {
            Object.entries(item.stats.BonusDmg).forEach(([elem, dmg]) => {
                const weight = weights.BonusDmg?.[elem as Theme] || 0;
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

const getModifiedStats = (baseStats: Stats, buffs: (Buff | Debuff)[], form?: string | null): Stats => {
    const modifiedStats: Stats = { ...baseStats };
    const allMods = buffs.flatMap(b => b.statMods || []);

    allMods.filter(mod => mod.modifier === 'multiplicative').forEach(mod => {
        const statKey = mod.stat as keyof Stats;
        const statValue = modifiedStats[statKey];
        if (typeof statValue === 'number') {
            (modifiedStats[statKey] as number) *= mod.value;
        }
    });

    allMods.filter(mod => mod.modifier === 'additive').forEach(mod => {
        const statKey = mod.stat as keyof Stats;
        const statValue = modifiedStats[statKey];
        if (typeof statValue === 'number') {
            (modifiedStats[statKey] as number) += mod.value;
        }
    });

    if (form === 'shadow') {
        modifiedStats.ShadowDamageMultiplier = (modifiedStats.ShadowDamageMultiplier || 1) * 1.15;
        modifiedStats.DamageReductionMultiplier = (modifiedStats.DamageReductionMultiplier || 1) * 0.85;
    }

    return modifiedStats;
}

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

      checkAndApplyLevelUp: () => {
        const playerLevelBefore = get().player.level;
        let didLevelUp = false;

        set((state) => {
            // Inlined getXpToNextLevel to avoid using get() inside set()
            let xpToNext = Math.floor(100 * Math.pow(state.player.level, 1.5));

            while (state.player.xp >= xpToNext) {
                didLevelUp = true;
                state.player.level++;
                state.player.talentPoints += 2;
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

      gambleForItem: (itemSlot: string) => {
          const state = get();
          const cost = 100 * state.worldTier;
          if (state.inventory.gold < cost) {
              console.log("Not enough gold to gamble");
              // TODO: Add user feedback
              return null;
          }

          const possibleTemplates = state.gameData.items.filter(item => item.slot === itemSlot && item.rarity !== "Légendaire" && item.rarity !== "Unique" && !item.set);
          if (possibleTemplates.length === 0) {
              console.log("No items found for that slot");
              // TODO: Add user feedback
              return null;
          }


          // Determine rarity - low chance for high rarity
          const roll = Math.random();
          let rarity: Rareté = "Commun";
          if (roll < 0.02) rarity = "Légendaire"; // 2% chance for Legendary
          else if (roll < 0.10) rarity = "Épique";   // 8% chance for Epic
          else if (roll < 0.35) rarity = "Rare";     // 25% chance for Rare
                                                      // 65% chance for Common

          const baseItemTemplate = possibleTemplates[Math.floor(Math.random() * possibleTemplates.length)];
          const itemLevel = state.player.level;
          const { id, niveauMin, affixes, ...baseItemProps } = baseItemTemplate;
          const newItem = generateProceduralItem(baseItemProps, itemLevel, rarity, state.gameData.affixes, undefined);

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

      recalculateStats: (options?: { forceRestore?: boolean }) => {
        set((state: GameState) => {
          const { player, inventory, gameData } = state;
          if (!player.classeId) return;

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
          // 1. Reset stats to a clean copy of base stats
          player.stats = { ...player.baseStats };
          if (player.stats.ResElems) {
            player.stats.ResElems = { ...player.baseStats.ResElems };
          }

          const equippedSetCounts: Record<string, number> = {};

          // 2. Apply stats from equipped items
          Object.values(inventory.equipment).forEach(item => {
            if (item) {
              if (item.affixes) {
                item.affixes.forEach(affix => {
                  const statKey = affix.ref as keyof Stats;
                  const statValue = player.stats[statKey];

                  if (typeof statValue === 'number' && typeof affix.val === 'number') {
                    (player.stats[statKey] as number) = statValue + affix.val;
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

          // 3. Apply set bonuses
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

                                if (mod.modifier === 'additive') {
                                    (player.stats[statKey] as number) = statValue + value;
                                } else if (mod.modifier === 'multiplicative') {
                                    (player.stats[statKey] as number) = statValue * value;
                                }
                            }
                        });
                    }
                });
              } else { // Fallback to old effect strings
                talentData.effets.forEach(effectString => {
                    const value = getTalentEffectValue(effectString, rank);
                    if (effectString.includes('Armure') && typeof player.stats.Armure === 'number') {
                        player.stats.Armure += (player.stats.Armure * value) / 100;
                    } else if (effectString.includes('PV') && typeof player.stats.PV === 'number') {
                        player.stats.PV += (player.stats.PV * value) / 100;
                    } // ... and so on for other stats, always with type checks
                });
              }
          });

          // --- Final calculations and state updates ---
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
          // With the new direct-draft-mutation approach, currentHp should be correctly typed as number
          if (options?.forceRestore || state.view !== 'COMBAT' || currentHp <= 0 || currentHp > maxHp) {
            player.stats.PV = maxHp;
            player.shield = 0;
            if(state.player.resources.type !== 'Rage') {
              player.resources.current = player.resources.max;
            }
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

          const price = getItemBuyPrice(itemToBuy); // Le prix est calculé ici
          if (price <= 0 || inventory.gold < price) {
              return false;
          }

          const newItem: Item = JSON.parse(JSON.stringify(itemToBuy));
          newItem.id = uuidv4();
          // Pas besoin de supprimer vendorPrice car il ne fait pas partie de l'objet de base

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

      usePotion: (potionType: PotionType) => {
          set((state: GameState) => {
              if (potionType === 'health') {
                 if (state.inventory.potions.health > 0) {
                    const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                    let healAmount = Math.round(maxHp * 0.15);

                    const buffedStats = getModifiedStats(state.player.stats, state.player.activeBuffs, state.player.form);
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

                    const chestItem = generateProceduralItem(baseItemProps, itemLevel, bonusRarity, gameData.affixes, state.currentDungeon || undefined);
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
          const { view, combat } = get();

          if(view !== 'COMBAT' || !combat.enemies || combat.enemies.length === 0) {
            if(gameLoop) clearInterval(gameLoop);
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

              const stealthExpired = state.player.activeBuffs.some(b => b.id === 'stealth' && b.duration <= delta);

              state.player.activeBuffs = state.player.activeBuffs.filter(buff => {
                  buff.duration -= delta;
                  if (buff.duration <= 0) return false;

                  if (buff.healingPerTick && buff.nextTickIn !== undefined && buff.tickInterval !== undefined) {
                      buff.nextTickIn -= delta;
                      if (buff.nextTickIn <= 0) {
                        const buffedStats = getModifiedStats(state.player.stats, state.player.activeBuffs, state.player.form);
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

              state.combat.enemies.forEach(enemy => {
                  if(enemy.stats.PV > 0) {
                    if (enemy.stunDuration > 0) {
                        enemy.stunDuration -= delta;
                    } else {
                        const attackInterval = enemy.stats.Vitesse * 1000;
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

            const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
            const debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs);

            const damage = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
            const isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats.Esquive);
            let finalDamage = isCrit ? damage * (buffedPlayerStats.CritDmg / 100) : damage;

            finalDamage *= (buffedPlayerStats.DamageMultiplier || 1);

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

            const dr = formulas.calculateArmorDR(debuffedTargetStats.Armure, player.level);
            const mitigatedDamage = Math.round(finalDamage * (isCleave ? 0.5 : 1) * (1 - dr));

            target.stats.PV -= mitigatedDamage;

            // Elemental Damage
            if (buffedPlayerStats.BonusDmg) {
                Object.entries(buffedPlayerStats.BonusDmg).forEach(([elem, dmg]) => {
                    if (dmg > 0) {
                        const res = debuffedTargetStats.ResElems?.[elem as keyof typeof debuffedTargetStats.ResElems] || 0;
                        const elemDR = formulas.calculateResistanceDR(res, player.level);
                        const mitigatedElemDmg = Math.round(dmg * (1 - elemDR));
                        target.stats.PV -= mitigatedElemDmg;
                        combat.log.push({ message: `Votre attaque inflige ${mitigatedElemDmg} points de dégâts de ${elem}.`, type: 'player_attack', timestamp: Date.now() });
                    }
                });
            }

            // Deadly Poison proc
            if (player.activeBuffs.some(b => b.id === 'deadly_poison_buff') && Math.random() < 0.3) {
                const poisonDamage = 5; // As per skill description
                target.stats.PV -= poisonDamage;
                combat.log.push({ message: `Your Deadly Poison deals an additional ${poisonDamage} damage to ${target.nom}.`, type: 'poison_proc', timestamp: Date.now() });
            }

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
            const rank = player.learnedSkills[skillId];
            const skill = gameData.skills.find(t => t.id === skillId);
            if (!skill || !rank) return;

            if (player.form === 'shadow' && skill.school === 'holy') {
                combat.log.push({ message: "Vous ne pouvez pas utiliser de sorts Sacrés en Forme d'ombre.", type: 'info', timestamp: Date.now() });
                return;
            }
            if (player.stunDuration > 0) {
                combat.log.push({ message: "Vous êtes étourdi et ne pouvez pas agir.", type: 'info', timestamp: Date.now() });
                return;
            }
            if ((combat.skillCooldowns[skillId] || 0) > 0) {
                return;
            }

            // NEW DATA-DRIVEN LOGIC
            if (skill.effects) {
                const costEffect = skill.effects.find(e => (e as any).type === 'resource_cost') as any;
                const resourceCost = costEffect ? costEffect.amount : 0;

                if (player.resources.current < resourceCost) {
                    combat.log.push({ message: "Pas assez de ressource!", type: 'info', timestamp: Date.now() });
                    return;
                }

                let effectApplied = false;

                skill.effects.forEach(effect => {
                    const anyEffect = effect as any; // Using 'any' to simplify access to properties

                    // Determine targets for this effect
                    let targets: CombatEnemy[] = [];
                    const primaryTarget = combat.enemies[combat.targetIndex];

                    if (anyEffect.target === 'all_enemies') {
                        targets = state.combat.enemies.filter(e => e.stats.PV > 0);
                    } else { // 'primary' or undefined
                        if (primaryTarget && primaryTarget.stats.PV > 0) {
                            targets.push(primaryTarget);
                        }
                    }

                    targets.forEach(target => {
                        const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
                        const debuffedTargetStats = getModifiedStats(target.stats, target.activeDebuffs);

                        let conditionsMet = true;
                        if (anyEffect.conditions) {
                            if (anyEffect.conditions.targetHpLessThan) {
                                const hpPercent = (target.stats.PV / target.initialHp) * 100;
                                if (hpPercent >= anyEffect.conditions.targetHpLessThan) {
                                    conditionsMet = false;
                                }
                            }
                        }

                        if (conditionsMet) {
                            if (anyEffect.type === 'damage') {
                                let damage = 0;
                            if (anyEffect.source === 'weapon') {
                            const baseDmg = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                            damage = baseDmg * (anyEffect.multiplier || 1);
                        } else if (anyEffect.source === 'spell') {
                            // TODO: Handle rank-based scaling
                            const baseDmg = anyEffect.baseValue || 0;
                            damage = formulas.calculateSpellDamage(baseDmg, formulas.calculateSpellPower(buffedPlayerStats));
                        }

                        const isCrit = formulas.isCriticalHit(buffedPlayerStats.CritPct, buffedPlayerStats.Precision, debuffedTargetStats.Esquive);
                        let finalDamage = isCrit ? damage * (buffedPlayerStats.CritDmg / 100) : damage;

                        finalDamage *= (buffedPlayerStats.DamageMultiplier || 1);

                        if (anyEffect.damageType === 'shadow') {
                            finalDamage *= (buffedPlayerStats.ShadowDamageMultiplier || 1);
                        }

                        const dr = formulas.calculateArmorDR(debuffedTargetStats.Armure, player.level);
                        const mitigatedDamage = Math.round(finalDamage * (1 - dr));

                        target.stats.PV -= mitigatedDamage;

                        // Elemental Damage from stats
                        if (buffedPlayerStats.BonusDmg) {
                            Object.entries(buffedPlayerStats.BonusDmg).forEach(([elem, dmg]) => {
                                if (dmg > 0) {
                                    const res = debuffedTargetStats.ResElems?.[elem as keyof typeof debuffedTargetStats.ResElems] || 0;
                                    const elemDR = formulas.calculateResistanceDR(res, player.level);
                                    const mitigatedElemDmg = Math.round(dmg * (1 - elemDR));
                                    target.stats.PV -= mitigatedElemDmg;
                                    combat.log.push({ message: `Votre compétence inflige ${mitigatedElemDmg} points de dégâts de ${elem}.`, type: 'player_attack', timestamp: Date.now() });
                                }
                            });
                        }

                        const msg = `Vous utilisez ${skill.nom} sur ${target.nom} pour ${mitigatedDamage} points de dégâts.`;
                        const critMsg = `CRITIQUE ! Votre ${skill.nom} inflige ${mitigatedDamage} points de dégâts à ${target.nom}.`;
                        combat.log.push({ message: isCrit ? critMsg : msg, type: isCrit ? 'crit' : 'player_attack', timestamp: Date.now() });
                        effectApplied = true;
                        if (target.stats.PV <= 0) deadEnemyIds.push(target.id);
                            }

                            if (anyEffect.type === 'debuff') {
                                if (anyEffect.debuffType === 'dot') {
                                let totalDamage = 0;
                                if (anyEffect.totalDamage.source === 'weapon') {
                                    const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
                                    const baseDmg = formulas.calculateMeleeDamage(buffedPlayerStats.AttMin, buffedPlayerStats.AttMax, formulas.calculateAttackPower(buffedPlayerStats));
                                    totalDamage = baseDmg * (anyEffect.totalDamage.multiplier || 1);
                                } else if (anyEffect.totalDamage.source === 'base_value') {
                                    totalDamage = anyEffect.totalDamage.multiplier;
                                }
                                const damagePerTick = Math.round(totalDamage / anyEffect.duration);

                                target.activeDebuffs.push({
                                    id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration * 1000,
                                    damagePerTick: damagePerTick, tickInterval: 1000, nextTickIn: 1000,
                                });
                                combat.log.push({ message: `Vous utilisez ${skill.nom} sur ${target.nom}, qui commence à souffrir de ${anyEffect.name}.`, type: 'player_attack', timestamp: Date.now() });
                            } else if (anyEffect.debuffType === 'cc' && anyEffect.ccType === 'stun') {
                                target.stunDuration = anyEffect.duration * 1000;
                                combat.log.push({ message: `${target.nom} est étourdi pour ${anyEffect.duration} secondes!`, type: 'info', timestamp: Date.now() });
                            } else if (anyEffect.debuffType === 'stat_modifier') {
                                target.activeDebuffs.push({
                                    id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration * 1000,
                                    statMods: anyEffect.statMods,
                                });
                                    combat.log.push({ message: `${target.nom} est affecté par ${anyEffect.name}.`, type: 'enemy_attack', timestamp: Date.now() });
                                }
                                effectApplied = true;
                            }
                        }
                    });

                    if (anyEffect.type === 'invulnerability') {
                        player.invulnerabilityDuration = anyEffect.duration * 1000;
                        combat.log.push({ message: `Vous êtes invulnérable !`, type: 'info', timestamp: Date.now() });
                        effectApplied = true;
                    }

                    if (anyEffect.type === 'transformation') {
                        if (player.form === anyEffect.form) {
                            player.form = null; // Toggle off
                            combat.log.push({ message: `Vous quittez la forme ${anyEffect.form}.`, type: 'info', timestamp: Date.now() });
                        } else {
                            player.form = anyEffect.form;
                            combat.log.push({ message: `Vous adoptez la forme ${anyEffect.form}.`, type: 'info', timestamp: Date.now() });
                        }
                        effectApplied = true;
                    }

                    if (anyEffect.type === 'death_ward') {
                        player.activeBuffs.push({
                            id: 'guardian_spirit_ward',
                            name: 'Esprit gardien',
                            duration: anyEffect.duration * 1000,
                            isDeathWard: true,
                            deathWardHealPercent: anyEffect.heal_percent,
                        });
                        combat.log.push({ message: `Un Esprit gardien vous protège.`, type: 'info', timestamp: Date.now() });
                        effectApplied = true;
                    }

                    if (anyEffect.type === 'buff') {
                        if (anyEffect.id === 'ice_block_stun') {
                            player.stunDuration = anyEffect.duration * 1000;
                        }

                        if (anyEffect.buffType === 'hot') {
                            if (anyEffect.totalHealing) {
                                const totalHealing = anyEffect.totalHealing.multiplier;
                                const healingPerTick = totalHealing / anyEffect.duration;
                                player.activeBuffs.push({
                                    id: anyEffect.id, name: anyEffect.name, duration: anyEffect.duration * 1000,
                                    healingPerTick: healingPerTick, tickInterval: 1000, nextTickIn: 1000,
                                });
                                combat.log.push({ message: `Vous appliquez ${anyEffect.name}, vous soignant sur la durée.`, type: 'heal', timestamp: Date.now() });
                            }
                        } else if (anyEffect.buffType === 'stat_modifier') {
                            player.activeBuffs.push({
                                id: anyEffect.id,
                                name: anyEffect.name,
                                duration: anyEffect.duration * 1000,
                                statMods: anyEffect.statMods,
                            });
                            combat.log.push({ message: `Vous gagnez l'effet ${anyEffect.name}.`, type: 'info', timestamp: Date.now() });
                        } else if (anyEffect.buffType === 'special') {
                            player.activeBuffs.push({
                                id: anyEffect.id,
                                name: anyEffect.name,
                                duration: anyEffect.duration * 1000,
                                value: anyEffect.value,
                            });
                            combat.log.push({ message: `Vous gagnez l'effet ${anyEffect.name}.`, type: 'info', timestamp: Date.now() });
                        }
                        effectApplied = true;
                    }

                    if (anyEffect.type === 'shield') {
                        let shieldAmount = 0;
                        if (anyEffect.amount.source === 'base_value') {
                            shieldAmount = anyEffect.amount.multiplier;
                        } else if (anyEffect.amount.source === 'spell_power') {
                            const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
                            const spellPower = formulas.calculateSpellPower(buffedPlayerStats);
                            shieldAmount = spellPower * anyEffect.amount.multiplier;
                        }
                        player.shield += shieldAmount;
                        combat.log.push({ message: `Vous gagnez un bouclier absorbant ${Math.round(shieldAmount)} dégâts.`, type: 'shield', timestamp: Date.now() });
                        effectApplied = true;
                    }
                });

                if (effectApplied) {
                    player.resources.current -= resourceCost;
                    combat.skillCooldowns[skillId] = (skill.cooldown || 0) * 1000;
                    state.combat.playerAttackProgress = 0;
                }
                return; // End of new logic
            }

            // OLD LOGIC STARTS HERE
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
                    name: 'Prière de guérison',
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
                    player.activeBuffs.push({ id: 'mana_shield', name: 'Bouclier de Mana', duration: 20000, value: 0.5 }); // 50% damage to mana
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

                            // Embrasement (Combustion) Talent Proc
                            const isFireSpell = skill.id.includes('_fire_');
                            const combustionRank = player.learnedTalents['mage_feu_embrasement'];

                            if (isFireSpell && combustionRank > 0) {
                                const procChance = (10 * combustionRank) / 100;
                                if (Math.random() < procChance) {
                                    const spellPower = formulas.calculateSpellPower(player.stats);
                                    const totalBurnDamage = spellPower * 0.5;
                                    const durationInSeconds = 4;
                                    const damagePerTick = Math.round(totalBurnDamage / durationInSeconds);

                                    const existingDebuffIndex = currentTarget.activeDebuffs.findIndex(d => d.id === 'combustion_burn');
                                    if (existingDebuffIndex !== -1) {
                                        currentTarget.activeDebuffs[existingDebuffIndex].duration = durationInSeconds * 1000;
                                        currentTarget.activeDebuffs[existingDebuffIndex].damagePerTick = damagePerTick;
                                        currentTarget.activeDebuffs[existingDebuffIndex].nextTickIn = 1000;
                                    } else {
                                        currentTarget.activeDebuffs.push({
                                            id: 'combustion_burn',
                                            name: 'Brûlure',
                                            duration: durationInSeconds * 1000,
                                            damagePerTick: damagePerTick,
                                            tickInterval: 1000,
                                            nextTickIn: 1000,
                                        });
                                    }
                                    combat.log.push({ message: `Le talent Embrasement s'active sur ${currentTarget.nom}, qui commence à brûler.`, type: 'player_attack', timestamp: Date.now() });
                                }
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
                player.activeBuffs.push({ id: 'stealth', name: 'Camouflage', duration: 10000 });
                combat.log.push({ message: "Vous vous camouflez dans l'ombre.", type: 'info', timestamp: Date.now() });
                if (state.combat.autoAttack) {
                    state.combat.autoAttack = false;
                }
                effectApplied = true;
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

            const buffedPlayerStats = getModifiedStats(player.stats, player.activeBuffs, player.form);
            // NOTE: Dodge mechanic is implemented here.
            const didDodge = Math.random() * 100 < buffedPlayerStats.Esquive;

            if (didDodge) {
                set((state: GameState) => {
                    state.combat.log.push({ message: `Vous esquivez l'attaque de ${enemy.nom}.`, type: 'info', timestamp: Date.now() });
                    const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                    if (enemyInState) enemyInState.attackProgress = 0;
                });
                get().applyTalentTrigger('on_dodge');
                return; // Skip the rest of the attack logic for this enemy
            }

            set((state: GameState) => {
                const enemyInState = state.combat.enemies.find(e => e.id === enemy.id);
                if (!enemyInState || enemyInState.stats.PV <= 0) return;

                if (state.player.invulnerabilityDuration > 0) {
                    state.combat.log.push({ message: `L'attaque de ${enemy.nom} est bloquée par votre invulnérabilité.`, type: 'shield', timestamp: Date.now() });
                    enemyInState.attackProgress = 0;
                    return;
                }

                let physicalDamage = formulas.calculateMeleeDamage(enemy.stats.AttMin, enemy.stats.AttMax, formulas.calculateAttackPower(enemy.stats));
                const playerDr = formulas.calculateArmorDR(state.player.stats.Armure, enemy.level);
                let mitigatedPhysicalDamage = Math.round(physicalDamage * (1 - playerDr));

                let mitigatedElementalDamage = 0;
                let elementalDamageType: string | undefined = undefined;

                // Check for monster's inherent elemental damage
                if (enemyInState.elementalDamage) {
                    const elementalRoll = Math.random() * (enemyInState.elementalDamage.max - enemyInState.elementalDamage.min) + enemyInState.elementalDamage.min;
                    const playerRes = state.player.stats.ResElems?.[enemyInState.elementalDamage.type] ?? 0;
                    const elementalDR = formulas.calculateResistanceDR(playerRes, enemyInState.level);
                    mitigatedElementalDamage = Math.round(elementalRoll * (1 - elementalDR));
                    elementalDamageType = enemyInState.elementalDamage.type;
                }

                let totalDamage = mitigatedPhysicalDamage + mitigatedElementalDamage;

                const buffedPlayerStats = getModifiedStats(state.player.stats, state.player.activeBuffs, state.player.form);
                totalDamage *= (buffedPlayerStats.DamageReductionMultiplier || 1);
                totalDamage = Math.round(totalDamage);

                if (state.player.shield > 0) {
                    const manaShieldBuff = state.player.activeBuffs.find(b => b.id === 'mana_shield');
                    let shieldAbsorption = Math.min(state.player.shield, totalDamage);

                    if (manaShieldBuff && state.player.resources.type === 'Mana') {
                        const manaDrain = Math.floor(shieldAbsorption * manaShieldBuff.value);
                        const actualManaDrained = Math.min(manaDrain, state.player.resources.current);

                        state.player.resources.current -= actualManaDrained;
                        shieldAbsorption -= (manaDrain - actualManaDrained);

                        state.combat.log.push({ message: `Votre bouclier convertit ${actualManaDrained} dégâts en perte de mana.`, type: 'shield', timestamp: Date.now() });
                    }

                    state.player.shield -= shieldAbsorption;
                    totalDamage -= shieldAbsorption;
                    state.combat.log.push({ message: `L'attaque de ${enemy.nom} est absorbée par votre bouclier pour ${shieldAbsorption} points.`, type: 'shield', timestamp: Date.now() });
                }

                if (totalDamage > 0) {
                    if (state.player.stats.PV - totalDamage <= 0) { // Check for lethal damage
                        const deathWardBuff = state.player.activeBuffs.find(b => b.isDeathWard);
                        if (deathWardBuff && deathWardBuff.deathWardHealPercent) {
                            const maxHp = formulas.calculateMaxHP(state.player.level, state.player.stats);
                            const healAmount = maxHp * (deathWardBuff.deathWardHealPercent / 100);
                            state.player.stats.PV = healAmount; // Set HP to the heal amount
                            state.combat.log.push({ message: `Votre Esprit gardien vous a sauvé de la mort et vous a soigné pour ${Math.round(healAmount)} PV!`, type: 'heal', timestamp: Date.now() });

                            // Remove the buff
                            state.player.activeBuffs = state.player.activeBuffs.filter(b => b.id !== deathWardBuff.id);

                            totalDamage = 0; // Negate the damage
                        }
                    }

                    if (totalDamage > 0) {
                        state.player.stats.PV -= totalDamage;
                        const elementalTypeToFrench: Record<string, string> = {
                            fire: 'feu',
                            ice: 'glace',
                            nature: 'nature',
                            shadow: 'ombre',
                        };
                        const translatedType = elementalDamageType ? elementalTypeToFrench[elementalDamageType] || elementalDamageType : '';

                        let damageMessage = `${enemy.nom} vous inflige ${totalDamage} points de dégâts`;
                        if (mitigatedElementalDamage > 0 && translatedType) {
                            damageMessage += ` (${mitigatedPhysicalDamage} physiques, ${mitigatedElementalDamage} de ${translatedType})`;
                        }
                        damageMessage += '.';
                        state.combat.log.push({ message: damageMessage, type: 'enemy_attack', timestamp: Date.now() });
                    }
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

      applyTalentTrigger: (trigger) => {
        set((state: GameState) => {
            const { player, gameData } = state;
            Object.entries(player.learnedTalents).forEach(([talentId, rank]) => {
                const talent = gameData.talents.find(t => t.id === talentId);
                if (!talent || !talent.triggeredEffects) return;

                talent.triggeredEffects.forEach(triggeredEffect => {
                    if (triggeredEffect.trigger === trigger) {
                        if (Math.random() < (triggeredEffect.chance || 1)) {
                            triggeredEffect.effects.forEach(effect => {
                                const anyEffect = effect as any;
                                if (anyEffect.type === 'buff' && anyEffect.buffType === 'stat_modifier') {
                                    const value = Array.isArray(anyEffect.statMods[0].value)
                                        ? anyEffect.statMods[0].value[Math.min(rank - 1, anyEffect.statMods[0].value.length - 1)] || 0
                                        : anyEffect.statMods[0].value;

                                    const newStatMod = { ...anyEffect.statMods[0], value: value };

                                    player.activeBuffs.push({
                                        id: anyEffect.id,
                                        name: anyEffect.name,
                                        duration: anyEffect.duration * 1000,
                                        statMods: [newStatMod],
                                    });
                                    state.combat.log.push({ message: `Le talent ${talent.nom} s'active !`, type: 'info', timestamp: Date.now() });
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
