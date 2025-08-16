
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { Zap, XCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function SkillsView() {
    const { player, gameData, equipSkill, unequipSkill } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        equipSkill: state.equipSkill,
        unequipSkill: state.unequipSkill,
    }));

    if (!player.classeId) return null;

    const learnedActiveSkills = gameData.talents.filter(talent =>
        talent.classeId === player.classeId &&
        talent.type === 'actif' &&
        (player.talents[talent.id] || 0) > 0
    );

    const availableSkills = learnedActiveSkills.filter(skill => !player.equippedSkills.includes(skill.id));
    const equippedSkills = player.equippedSkills.map(skillId => skillId ? gameData.talents.find(t => t.id === skillId) : null);

    const handleEquip = (skillId: string) => {
        const firstEmptySlot = player.equippedSkills.indexOf(null);
        if (firstEmptySlot !== -1) {
            equipSkill(skillId, firstEmptySlot);
        } else {
            // Optional: Show a toast or message that the bar is full
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Compétences</CardTitle>
                <CardDescription>Équipez jusqu'à 4 compétences actives à utiliser en combat.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-8">
                <div>
                    <h3 className="font-semibold mb-2 text-center">Compétences Disponibles</h3>
                    <Separator className="mb-4"/>
                    <div className="space-y-2 p-4 rounded-lg bg-background/50 min-h-[150px]">
                        {availableSkills.length > 0 ? availableSkills.map(skill => (
                            <div key={skill.id} className="p-2 border rounded-md bg-card/80 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-400" />
                                    <span>{skill.nom}</span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleEquip(skill.id)}>
                                    <PlusCircle className="h-4 w-4 mr-2"/>
                                    Équiper
                                </Button>
                            </div>
                        )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune autre compétence disponible à équiper.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2 text-center">Barre d'Action</h3>
                     <Separator className="mb-4"/>
                    <div className="grid grid-cols-4 gap-2">
                        {equippedSkills.map((skill, index) => (
                             <div key={index} className={cn("h-24 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors text-center", skill && "border-solid border-primary/50 bg-card/50")}>
                                {skill ? (
                                    <div className="relative w-full h-full p-2 flex items-center justify-center">
                                        <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-6 w-6" onClick={() => unequipSkill(index)}>
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        </Button>
                                        <div className="flex flex-col items-center gap-1">
                                             <Zap className="h-5 w-5 text-yellow-400" />
                                             <span className="text-xs">{skill.nom}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground p-2">Emplacement Vide</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
