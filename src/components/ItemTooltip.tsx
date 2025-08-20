
'use client';

import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Item, Rareté, Stats } from "@/lib/types";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";

const rarityColorMap: Record<Rareté, string> = {
    Commun: 'text-gray-400',
    Rare: 'text-blue-400',
    Épique: 'text-purple-500',
    Légendaire: 'text-yellow-500',
    Unique: 'text-orange-500',
};

type StatKey = keyof Omit<Stats, 'PV' | 'RessourceMax'>;


const STAT_ORDER: StatKey[] = [
    'Force', 'Intelligence', 'Dexterite', 'Esprit',
    'AttMin', 'AttMax', 'CritPct', 'CritDmg',
    'Armure', 'Vitesse', 'Precision', 'Esquive'
];

type ComparisonResult = { diff: number; type: 'better' | 'worse' | 'equal' | 'new' | 'lost' };

function ItemStat({ label, value, comparison }: { label: string, value: string | number, comparison?: ComparisonResult }) {
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
            {value} {label} {diffElement}
        </p>
    );
}

function ItemTooltipContent({ item, equippedItem }: { item: Item, equippedItem?: Item | null }) {
    if (!item) return null;

    const comparisonStats: Partial<Record<StatKey, ComparisonResult>> = {};
    const allStatKeys = new Set<StatKey>();

    // Collect all stats from both items
    (item.affixes || []).forEach(a => allStatKeys.add(a.ref as StatKey));
    if (item.stats) Object.keys(item.stats).forEach(k => allStatKeys.add(k as StatKey));
    if (equippedItem) {
        (equippedItem.affixes || []).forEach(a => allStatKeys.add(a.ref as StatKey));
        if (equippedItem.stats) Object.keys(equippedItem.stats).forEach(k => allStatKeys.add(k as StatKey));
    }
    
    STAT_ORDER.forEach(stat => allStatKeys.add(stat));


    if (equippedItem) {
        allStatKeys.forEach(key => {
            const itemStatValue = (item.affixes || []).find(a => a.ref === key)?.val || (item.stats?.[key] as number) || 0;
            const equippedStatValue = (equippedItem.affixes || []).find(a => a.ref === key)?.val || (equippedItem.stats?.[key] as number) || 0;

            if (itemStatValue === 0 && equippedStatValue === 0) return;

            const diff = itemStatValue - equippedStatValue;

            if (itemStatValue > 0 && equippedStatValue === 0) {
                comparisonStats[key] = { diff, type: 'new' };
            } else if (itemStatValue === 0 && equippedStatValue > 0) {
                comparisonStats[key] = { diff: -equippedStatValue, type: 'lost' };
            } else if (diff > 0) {
                comparisonStats[key] = { diff, type: 'better' };
            } else if (diff < 0) {
                comparisonStats[key] = { diff, type: 'worse' };
            } else if (itemStatValue !== 0) {
                comparisonStats[key] = { diff: 0, type: 'equal' };
            }
        });
    }

    const itemAffixes = [...(item.affixes || [])];
    if (item.stats) {
        Object.entries(item.stats).forEach(([key, val]) => {
             if (typeof val === 'number' && val && !itemAffixes.some(a => a.ref === key)) {
                 itemAffixes.push({ ref: key, val: val });
            }
        });
    }

    const lostStats = equippedItem ? Object.keys(comparisonStats)
        .filter(key => comparisonStats[key as StatKey]?.type === 'lost')
        .map(key => {
             const equippedStatValue = (equippedItem.affixes || []).find(a => a.ref === key)?.val || (equippedItem.stats?.[key as StatKey] as number) || 0;
            return { ref: key, val: equippedStatValue };
        }) : [];

    const allSortedAffixes = [...itemAffixes, ...lostStats]
        .filter((affix, index, self) => index === self.findIndex(t => t.ref === affix.ref))
        .sort((a, b) => STAT_ORDER.indexOf(a.ref as StatKey) - STAT_ORDER.indexOf(b.ref as StatKey));

    return (
        <div className="p-2 text-xs w-64">
            <h4 className={`font-bold ${rarityColorMap[item.rarity]}`}>{item.name}</h4>
            <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{item.slot}</span>
                <span>Niveau {item.niveauMin}</span>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
                {allSortedAffixes.map((affix) => (
                    <ItemStat 
                        key={affix.ref}
                        label={affix.ref}
                        value={`${affix.val > 0 ? '+' : ''}${affix.val}`}
                        comparison={comparisonStats[affix.ref as StatKey]}
                    />
                ))}
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
