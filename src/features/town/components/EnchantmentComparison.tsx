import React from 'react';
import type { Enchantment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STAT_DISPLAY_NAMES } from '@/lib/constants';

type SimpleAffix = { ref: string; val: number; isEnchantment?: boolean };

interface EnchantmentComparisonProps {
    currentAffix: SimpleAffix;
    newEnchantment: Enchantment;
}

const parseAffixRef = (affixRef: string): { name: string; value: number } | null => {
    const match = affixRef.match(/^([a-zA-Z]+)_(\d+)(pct)?$/);
    if (!match) return null;

    const statRefMap: Record<string, string> = {
        'force': 'Force', 'intellect': 'Intelligence', 'dexterity': 'Dexterite', 'stamina': 'PV',
        'armor': 'Armure', 'haste': 'Vitesse', 'crit': 'CritPct', 'spell_power': 'Intelligence'
    };

    const statKey = statRefMap[match[1]] || match[1];
    const statName = STAT_DISPLAY_NAMES[statKey] || statKey;
    const statValue = parseInt(match[2], 10);

    return { name: statName, value: statValue };
};

export const EnchantmentComparison: React.FC<EnchantmentComparisonProps> = ({ currentAffix, newEnchantment }) => {
    const currentParsed = parseAffixRef(currentAffix.ref);
    const newParsed = parseAffixRef(newEnchantment.affixRef);

    if (!currentParsed || !newParsed) {
        // Fallback for unparsable or different stat types
        return (
             <Card className="mt-4 border-yellow-500/50">
                <CardHeader>
                    <CardTitle className="text-yellow-500">Remplacement d&apos;Enchantement</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-sm">Remplacera l&apos;enchantement existant.</p>
                    <p className="text-xs text-center mt-2 text-gray-400">
                        {currentAffix.ref} par {newEnchantment.name}
                    </p>
                </CardContent>
            </Card>
        )
    }

    const valueDiff = newParsed.value - currentParsed.value;
    const diffColor = valueDiff > 0 ? 'text-green-500' : valueDiff < 0 ? 'text-red-500' : 'text-gray-400';
    const diffSign = valueDiff > 0 ? '+' : '';

    return (
        <Card className="mt-4 border-yellow-500/50">
            <CardHeader>
                <CardTitle className="text-yellow-500 text-base">Remplacement d&apos;Enchantement</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                        <h4 className="font-semibold text-gray-400">Actuel</h4>
                        <p className="text-gray-200">+{currentParsed.value} {currentParsed.name}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-400">Nouveau</h4>
                        <p className="text-gray-200">+{newParsed.value} {newParsed.name}</p>
                    </div>
                </div>
                 <div className="text-center mt-2">
                    <p className={diffColor}>Changement: {diffSign}{valueDiff}</p>
                </div>
            </CardContent>
        </Card>
    );
};
