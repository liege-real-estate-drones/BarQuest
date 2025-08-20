'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';

export function ActiveSetBonusesView() {
    const activeBonuses = useGameStore(state => state.player.activeSetBonuses);

    if (!activeBonuses || activeBonuses.length === 0) {
        return null; // Don't render anything if there are no active set bonuses
    }

    // To prevent duplicates from different sets providing the same bonus text,
    // though the current logic in gameStore should already handle this by just pushing strings.
    // A Set is a quick way to get unique values.
    const uniqueBonuses = [...new Set(activeBonuses)];

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Bonus de Set Actifs</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 list-disc list-inside">
                    {uniqueBonuses.map((bonus, index) => (
                        <li key={index} className="text-sm text-green-400">
                            {bonus}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
