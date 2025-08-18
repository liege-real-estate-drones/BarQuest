
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

function ItemStat({ label, value, diff }: { label: string, value: number | string, diff?: number }) {
    let diffElement = null;
    if (diff !== undefined && diff !== 0) {
        const diffColor = diff > 0 ? 'text-green-500' : 'text-red-500';
        const diffSign = diff > 0 ? '+' : '';
        diffElement = <span className={cn("ml-2 font-mono", diffColor)}>({diffSign}{diff})</span>;
    }

    return (
        <p className="text-green-400">
            {value} {label} {diffElement}
        </p>
    );
}

function ItemTooltipContent({ item, equippedItem }: { item: Item, equippedItem?: Item | null }) {
    if (!item) return null;

    const comparisonStats: Partial<Record<StatKey, number>> = {};
    if (equippedItem) {
        STAT_ORDER.forEach(key => {
            const itemStat = item.affixes.find(a => a.ref === key)?.val || (item.stats?.[key] as number) || 0;
            const equippedStat = equippedItem.affixes.find(a => a.ref === key)?.val || (equippedItem.stats?.[key] as number) || 0;
            const diff = itemStat - equippedStat;
            if (diff !== 0) {
                 comparisonStats[key] = diff;
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
                {item.affixes.map((affix, i) => (
                    <ItemStat 
                        key={i} 
                        label={affix.ref} 
                        value={`+${affix.val}`}
                        diff={comparisonStats[affix.ref as StatKey]}
                    />
                ))}
                 {item.stats && STAT_ORDER.map(key => {
                     const val = item.stats![key as StatKey];
                     if (val) {
                         return <ItemStat key={key} label={key} value={val} diff={comparisonStats[key]} />
                     }
                     return null;
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
