
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { Zap, XCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function SkillsView() {
    const { player, gameData, equipSkill, unequipSkill, learnSkill } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        equipSkill: state.equipSkill,
        unequipSkill: state.unequipSkill,
        learnSkill: state.learnSkill
    }));

    if (!player.classeId) return null;

    const learnedSkills = gameData.skills.filter(skill =>
        skill.classeId === player.classeId &&
        (player.learnedSkills[skill.id] || 0) > 0
    );

    const availableToDisplay = learnedSkills.filter(skill => !player.equippedSkills.includes(skill.id));
    const equippedSkillsDetails = player.equippedSkills.map(skillId => skillId ? gameData.skills.find(s => s.id === skillId) : null);
    
    const unlockedButNotLearnedSkills = gameData.skills.filter(skill => 
        skill.classeId === player.classeId &&
        player.level >= (skill.niveauRequis || 1) &&
        (player.learnedSkills[skill.id] || 0) === 0
    );

    const handleEquip = (skillId: string) => {
        const firstEmptySlot = player.equippedSkills.indexOf(null);
        if (firstEmptySlot !== -1) {
            equipSkill(skillId, firstEmptySlot);
        }
    };
    
     const canLearnSkill = (skillId: string): boolean => {
        if (player.talentPoints <= 0) return false;
        const skill = gameData.skills.find(t => t.id === skillId);
        if (!skill) return false;
        if ((player.learnedSkills[skill.id] || 0) >= skill.rangMax) return false;

        return (skill.exigences || []).every(req => {
            const [reqId, reqRankStr] = req.split(':');
            const reqRank = parseInt(reqRankStr, 10);
            return (player.learnedSkills[reqId] || 0) >= reqRank;
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Compétences Actives</CardTitle>
                <CardDescription>Apprenez et équipez jusqu'à 4 compétences à utiliser en combat.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4">
                 <div>
                    <h3 className="font-semibold mb-2 text-center">Compétences à Apprendre ({player.talentPoints} points)</h3>
                    <Separator className="mb-4"/>
                    <div className="space-y-2 p-4 rounded-lg bg-background/50 min-h-[100px]">
                        {unlockedButNotLearnedSkills.length > 0 ? unlockedButNotLearnedSkills.map(skill => (
                            <div key={skill.id} className="p-2 border rounded-md bg-card/80 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-muted-foreground" />
                                    <span>{skill.nom} <span className="text-xs text-muted-foreground">(Niv. {skill.niveauRequis})</span></span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => learnSkill(skill.id)} disabled={!canLearnSkill(skill.id)}>
                                    <PlusCircle className="h-4 w-4 mr-2"/>
                                    Apprendre
                                </Button>
                            </div>
                        )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune nouvelle compétence à ce niveau.</p>}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2 text-center">Compétences Disponibles</h3>
                    <Separator className="mb-4"/>
                    <div className="space-y-2 p-4 rounded-lg bg-background/50 min-h-[150px]">
                        {availableToDisplay.length > 0 ? availableToDisplay.map(skill => (
                            <div key={skill.id} className="p-2 border rounded-md bg-card/80 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-400" />
                                    <span>{skill.nom}</span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleEquip(skill.id)} disabled={player.equippedSkills.filter(s => s !== null).length >= 4}>
                                    <PlusCircle className="h-4 w-4 mr-2"/>
                                    Équiper
                                </Button>
                            </div>
                        )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune autre compétence à équiper.</p>}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold mb-2 text-center">Barre d'Action</h3>
                     <Separator className="mb-4"/>
                    <div className="grid grid-cols-4 gap-2">
                        {equippedSkillsDetails.map((skill, index) => (
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
