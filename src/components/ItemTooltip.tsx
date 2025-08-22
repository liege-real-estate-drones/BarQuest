
'use client';

import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Item, Rareté, Stats } from "@/lib/types";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { STAT_DISPLAY_NAMES } from "@/lib/constants";
import { useGameStore, STAT_WEIGHTS } from "@/state/gameStore";

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Magique: 'text-blue-300',
    Rare: 'text-blue-500',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

type StatKey = keyof Omit<Stats, 'PV' | 'RessourceMax'>;


export const STAT_ORDER: StatKey[] = [
    'Force', 'Intelligence', 'Dexterite', 'Esprit',
    'AttMin', 'AttMax', 'CritPct', 'CritDmg',
    'Armure', 'Vitesse', 'Precision', 'Esquive'
];

type ComparisonResult = { diff: number; type: 'better' | 'worse' | 'equal' | 'new' | 'lost' };

export function ItemStat({ label, value, comparison, isImportant }: { label: string, value: string | number, comparison?: ComparisonResult, isImportant?: boolean }) {
    let valueColor = 'text-gray-400';
    let diffElement = null;
    let valueClass = '';

    if (comparison) {
        switch (comparison.type) {
            case 'better':
                valueColor = 'text-green-500';
                break;
            case 'worse':
                valueColor = 'text-red-500';
                break;
            case 'equal':
                valueColor = 'text-gray-500';
                break;
            case 'new':
                valueColor = 'text-yellow-400';
                break;
            case 'lost':
                valueColor = 'text-red-500';
                valueClass = 'line-through';
                break;
        }

        if (comparison.type !== 'equal' && comparison.diff !== 0) {
            const diffSign = comparison.diff > 0 ? '+' : '';
            if(comparison.type !== 'lost' && comparison.type !== 'new') {
                diffElement = <span className={cn("ml-2 font-mono", valueColor)}>({diffSign}{comparison.diff})</span>;
            }
        }
    }


    return (
        <p className={cn(valueColor, valueClass)}>
            {isImportant && '⭐'} {value} {label} {diffElement}
        </p>
    );
}

export function ItemTooltipContent({ item, equippedItem }: { item: Item, equippedItem?: Item | null }) {
    const player = useGameStore(state => state.player);
    if (!item) return null;

    const classWeights = player.classeId ? STAT_WEIGHTS[player.classeId] : {};

    const getFlatStats = (i: Item) => {
        const stats: Record<string, number> = {};
        (i.affixes || []).forEach(a => { stats[a.ref] = (stats[a.ref] || 0) + a.val; });
        if (i.stats) {
            Object.entries(i.stats).forEach(([key, value]) => {
                if (key === 'BonusDmg' && typeof value === 'object' && value) {
                    Object.entries(value).forEach(([elem, dmg]) => {
                        if (typeof dmg === 'number') {
                            stats[`BonusDmg.${elem}`] = (stats[`BonusDmg.${elem}`] || 0) + dmg;
                        }
                    });
                } else if (typeof value === 'number') {
                    stats[key] = (stats[key] || 0) + value;
                }
            });
        }
        return stats;
    };

    const itemStats = getFlatStats(item);
    const equippedStats = equippedItem ? getFlatStats(equippedItem) : {};

    const allStatKeys = new Set([...Object.keys(itemStats), ...Object.keys(equippedStats)]);
    const sortedKeys = Array.from(allStatKeys).sort((a, b) => {
        const aIndex = STAT_ORDER.indexOf(a as StatKey);
        const bIndex = STAT_ORDER.indexOf(b as StatKey);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    return (
        <div className="p-2 text-xs w-64">
            <h4 className={`font-bold ${rarityColorMap[item.rarity]}`}>{item.name}</h4>
            <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{item.slot}</span>
                <span>Niveau {item.niveauMin}</span>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
                {sortedKeys.map(key => {
                    const itemValue = itemStats[key] || 0;
                    const equippedValue = equippedStats[key] || 0;
                    if (itemValue === 0 && equippedValue === 0) return null;

                    const diff = itemValue - equippedValue;
                    let comparison: ComparisonResult | undefined = undefined;
                    if (equippedItem) {
                        if (itemValue > 0 && equippedValue === 0) comparison = { diff, type: 'new' };
                        else if (itemValue === 0 && equippedValue > 0) comparison = { diff: -equippedValue, type: 'lost' };
                        else if (diff > 0) comparison = { diff, type: 'better' };
                        else if (diff < 0) comparison = { diff, type: 'worse' };
                        else if (itemValue !== 0) comparison = { diff: 0, type: 'equal' };
                    }

                    const valueToDisplay = comparison?.type === 'lost' ? equippedValue : itemValue;

                    let isImportant = !!(classWeights as any)[key];
                    if (!isImportant && key.startsWith('BonusDmg.')) {
                        isImportant = !!classWeights.BonusDmg;
                    }

                    return (
                        <ItemStat
                            key={key}
                            label={STAT_DISPLAY_NAMES[key] || key}
                            value={`${valueToDisplay > 0 ? '+' : ''}${valueToDisplay}`}
                            comparison={comparison}
                            isImportant={isImportant}
                        />
                    );
                })}
            </div>
             {item.set && (
                 <>
                    <Separator className="my-2" />
                    <p className="text-yellow-300">{item.set.name}</p>
                 </>
             )}
        </div>
    );
}

interface ItemTooltipProps {
    item: Item;
    equippedItem?: Item | null;
    children?: React.ReactNode;
    triggerClassName?: string;
}

export function ItemTooltip({ item, equippedItem, children, triggerClassName }: ItemTooltipProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className={cn("cursor-pointer flex items-center", triggerClassName)}>
                    <span className={cn(`underline decoration-dashed`, rarityColorMap[item.rarity])}>
                        {item.name}
                    </span>
                    {children}
                </div>
            </PopoverTrigger>
            <PopoverContent>
                <ItemTooltipContent item={item} equippedItem={equippedItem} />
            </PopoverContent>
        </Popover>
    );
}
