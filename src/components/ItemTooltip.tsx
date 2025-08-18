
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

type ComparisonResult = { diff: number; type: 'better' | 'worse' | 'equal' | 'new' };

function ItemStat({ label, value, comparison }: { label: string, value: number | string, comparison?: ComparisonResult }) {
    let comparisonColor = 'text-green-400'; // Default color for stats without comparison
    let diffElement = null;

    if (comparison) {
        switch (comparison.type) {
            case 'better':
                comparisonColor = 'text-green-500';
                break;
            case 'worse':
                comparisonColor = 'text-red-500';
                break;
            case 'equal':
                comparisonColor = 'text-gray-500';
                break;
            case 'new':
                comparisonColor = 'text-yellow-400';
                break;
        }

        if (comparison.type !== 'equal' && comparison.type !== 'new' && comparison.diff !== 0) {
            const diffSign = comparison.diff > 0 ? '+' : '';
            diffElement = <span className={cn("ml-2 font-mono", comparisonColor)}>({diffSign}{comparison.diff})</span>;
        }
    }


    return (
        <p className={comparisonColor}>
            {value} {label} {diffElement}
        </p>
    );
}

function ItemTooltipContent({ item, equippedItem }: { item: Item, equippedItem?: Item | null }) {
    if (!item) return null;

    const comparisonStats: Partial<Record<StatKey, ComparisonResult>> = {};

    if (equippedItem) {
        const allKeys = new Set([...STAT_ORDER, ...item.affixes.map(a => a.ref), ...equippedItem.affixes.map(a => a.ref)]) as Set<StatKey>;
        
        allKeys.forEach(key => {
            const itemStat = item.affixes.find(a => a.ref === key)?.val || (item.stats?.[key] as number) || 0;
            const equippedStat = equippedItem.affixes.find(a => a.ref === key)?.val || (equippedItem.stats?.[key] as number) || 0;
            
            if (itemStat === 0 && equippedStat === 0) return;

            const diff = itemStat - equippedStat;
            
            if (itemStat > 0 && equippedStat === 0) {
                comparisonStats[key] = { diff, type: 'new' };
            } else if (diff > 0) {
                comparisonStats[key] = { diff, type: 'better' };
            } else if (diff < 0) {
                comparisonStats[key] = { diff, type: 'worse' };
            } else {
                comparisonStats[key] = { diff, type: 'equal' };
            }
        });
    }

    const allAffixes = [...item.affixes];
     if (item.stats) {
        STAT_ORDER.forEach(key => {
            const val = item.stats![key as StatKey];
            if (val) {
                 allAffixes.push({ ref: key, val: val });
            }
        });
    }


    return (
        <div className="p-2 text-xs w-64">
            <h4 className={`font-bold ${rarityColorMap[item.rarity]}`}>{item.name}</h4>
            <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{item.slot}</span>
                <span>Niveau {item.niveauMin}</span>
            </div>
            <Separator className="my-2" />
            <div className="space-y-1">
                {allAffixes.map((affix, i) => (
                    <ItemStat 
                        key={i} 
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
