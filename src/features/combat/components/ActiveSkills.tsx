
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Skill } from "@/lib/types";
import { Zap } from "lucide-react";

function SkillTooltipContent({ skill }: { skill: Skill }) {
    const effects = skill.effets || [];
    const resourceCostMatch = effects.join(' ').match(/Coûte (\d+) (Mana|Rage|Énergie)/);
    const resourceCost = resourceCostMatch ? `${resourceCostMatch[1]} ${resourceCostMatch[2]}` : null;
    
    return (
        <div className="max-w-xs p-2">
            <p className="font-bold text-base text-primary mb-1">{skill.nom}</p>
            {resourceCost && <p className="text-xs text-blue-400">Coût: {resourceCost}</p>}
            <Separator className="my-2" />
            <p className="text-sm mb-2">Effets :</p>
            <ul className="list-disc list-inside space-y-1">
                {effects.map((effet, i) => <li key={i} className="text-xs text-green-400">{effet}</li>)}
            </ul>
        </div>
    );
}

export function ActiveSkills({ skills }: { skills: Skill[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Compétences Actives</CardTitle>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    <div className="grid grid-cols-2 gap-4">
                        {skills.map((skill, index) => (
                            <Tooltip key={skill.id}>
                                <TooltipTrigger asChild>
                                    <div className="p-2 border rounded-md flex flex-col items-center justify-center gap-2 text-center h-24 bg-card/50 cursor-help">
                                        <Zap className="h-6 w-6 text-yellow-400"/>
                                        <p className="text-xs font-semibold">{skill.nom}</p>
                                        <span className="absolute top-1 right-1 text-xs text-muted-foreground/50 font-mono">[{index + 2}]</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <SkillTooltipContent skill={skill} />
                                </TooltipContent>
                            </Tooltip>
                        ))}
                         {[...Array(4 - skills.length)].map((_, index) => (
                            <div key={`empty-${index}`} className="border-dashed border-2 rounded-md flex items-center justify-center h-24 text-xs text-muted-foreground">
                                Vide
                            </div>
                        ))}
                    </div>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
}
