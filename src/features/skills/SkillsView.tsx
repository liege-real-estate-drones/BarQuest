
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { Zap, XCircle, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Skill } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const SkillPopoverContent = ({ skill }: { skill: Skill }) => {
    const effects = skill.effets || [];
    const resourceCostMatch = effects.join(' ').match(/Coûte (\d+) (Mana|Rage|Énergie)/);
    const resourceCost = resourceCostMatch ? `${resourceCostMatch[1]} ${resourceCostMatch[2]}` : null;
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{skill.nom}</p>
            <p className="text-sm text-muted-foreground capitalize">Compétence Active</p>
            {resourceCost && <p className="text-xs text-blue-400">Coût: {resourceCost}</p>}
            <Separator className="my-2" />
            <p className="text-sm mb-2">Effets :</p>
            <ul className="list-disc list-inside space-y-1">
                {effects.map((effet, i) => <li key={i} className="text-xs text-green-400">{effet}</li>)}
            </ul>
            {skill.niveauRequis && (
                <>
                    <Separator className="my-2" />
                    <p className="text-xs text-amber-400">- Requis: Niveau {skill.niveauRequis}</p>
                </>
            )}
        </div>
    );
}

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

    const availableToEquip = learnedSkills.filter(skill => !player.equippedSkills.includes(skill.id));
    const equippedSkillsDetails = player.equippedSkills.map(skillId => skillId ? gameData.skills.find(s => s.id === skillId) : null);
    
    const unlockedButNotLearnedSkills = gameData.skills.filter(skill => 
        skill.classeId === player.classeId &&
        player.level >= (skill.niveauRequis || 1) &&
        (!player.learnedSkills[skill.id] || player.learnedSkills[skill.id] === 0)
    );

    const handleEquip = (skillId: string) => {
        const firstEmptySlot = player.equippedSkills.indexOf(null);
        if (firstEmptySlot !== -1) {
            equipSkill(skillId, firstEmptySlot);
        } else {
            // If no empty slot, maybe show a toast? For now, we just disable the button.
            console.warn("No empty skill slots available.");
        }
    };
    
     const canLearnSkill = (skillId: string): boolean => {
        if (player.talentPoints <= 0) return false;
        const skill = gameData.skills.find(t => t.id === skillId);
        if (!skill) return false;
        if ((player.learnedSkills[skill.id] || 0) >= skill.rangMax) return false;
        if (player.level < (skill.niveauRequis || 1)) return false;


        return (skill.exigences || []).every(req => {
            const [reqId, reqRankStr] = req.split(':');
            const reqRank = parseInt(reqRankStr, 10);
            return (player.learnedSkills[reqId] || 0) >= reqRank;
        });
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Compétences Actives</span>
                    <span className="text-sm font-medium text-primary">{player.talentPoints} points restants</span>
                </CardTitle>
                <CardDescription>Apprenez et équipez jusqu'à 4 compétences à utiliser en combat.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
                 <div>
                    <h3 className="font-semibold mb-2 text-center">Compétences à Apprendre</h3>
                    <Separator className="mb-4"/>
                    <ScrollArea className="h-[200px] p-1">
                        <div className="space-y-2 p-3 rounded-lg bg-background/50 min-h-[100px]">
                            {unlockedButNotLearnedSkills.length > 0 ? unlockedButNotLearnedSkills.map(skill => (
                                <Popover key={skill.id}>
                                    <div className="p-2 border rounded-md bg-card/80 flex items-center justify-between gap-2">
                                        <PopoverTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-pointer">
                                                <Zap className="h-4 w-4 text-muted-foreground" />
                                                <span>{skill.nom} <span className="text-xs text-muted-foreground">(Niv. {skill.niveauRequis})</span></span>
                                            </div>
                                        </PopoverTrigger>
                                        <Button size="sm" variant="outline" onClick={() => learnSkill(skill.id)} disabled={!canLearnSkill(skill.id)}>
                                            <PlusCircle className="h-4 w-4 mr-2"/>
                                            Apprendre
                                        </Button>
                                    </div>
                                    <PopoverContent>
                                        <SkillPopoverContent skill={skill} />
                                    </PopoverContent>
                                </Popover>
                            )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune nouvelle compétence à ce niveau.</p>}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex-grow flex flex-col overflow-hidden">
                    <h3 className="font-semibold mb-2 text-center">Compétences Disponibles</h3>
                    <Separator className="mb-4"/>
                     <ScrollArea className="flex-grow p-1">
                        <div className="space-y-2 p-3 rounded-lg bg-background/50 min-h-[150px]">
                            {availableToEquip.length > 0 ? availableToEquip.map(skill => (
                               <Popover key={skill.id}>
                                    <div className="p-2 border rounded-md bg-card/80 flex items-center justify-between gap-2">
                                         <PopoverTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-pointer">
                                                <Zap className="h-4 w-4 text-yellow-400" />
                                                <span>{skill.nom}</span>
                                            </div>
                                         </PopoverTrigger>
                                        <Button size="sm" variant="outline" onClick={() => handleEquip(skill.id)} disabled={player.equippedSkills.filter(s => s !== null).length >= 4}>
                                            <PlusCircle className="h-4 w-4 mr-2"/>
                                            Équiper
                                        </Button>
                                    </div>
                                    <PopoverContent>
                                         <SkillPopoverContent skill={skill} />
                                    </PopoverContent>
                                </Popover>
                            )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune autre compétence à équiper.</p>}
                        </div>
                    </ScrollArea>
                </div>

                <div className="flex-shrink-0">
                    <h3 className="font-semibold mb-2 text-center">Barre d'Action</h3>
                     <Separator className="mb-4"/>
                    <div className="grid grid-cols-4 gap-2">
                        {equippedSkillsDetails.map((skill, index) => (
                             <div key={index} className={cn("h-24 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors text-center", skill && "border-solid border-primary/50 bg-card/50")}>
                                {skill ? (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <div className="relative w-full h-full p-2 flex items-center justify-center cursor-pointer">
                                                <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-6 w-6" onClick={(e) => { e.stopPropagation(); unequipSkill(index); }}>
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                </Button>
                                                <div className="flex flex-col items-center gap-1">
                                                     <Zap className="h-5 w-5 text-yellow-400" />
                                                     <span className="text-xs">{skill.nom}</span>
                                                </div>
                                            </div>
                                        </PopoverTrigger>
                                        <PopoverContent>
                                            <SkillPopoverContent skill={skill} />
                                        </PopoverContent>
                                    </Popover>
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
