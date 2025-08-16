
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/state/gameStore';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Zap, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function DraggableSkill({ id, children }: { id: string, children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id,
    });
    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-2 border rounded-md bg-card/80 flex items-center gap-2 touch-none">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            {children}
        </div>
    );
}

function DroppableSlot({ id, children, isOccupied }: { id: string, children: React.ReactNode, isOccupied: boolean }) {
    const { isOver, setNodeRef } = useDroppable({
        id,
    });

    return (
        <div ref={setNodeRef} className={cn("h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors", isOver && "border-primary bg-primary/20", isOccupied && "border-solid")}>
            {children}
        </div>
    );
}

export function SkillsView() {
    const { player, gameData, equipSkill, unequipSkill } = useGameStore(state => ({
        player: state.player,
        gameData: state.gameData,
        equipSkill: state.equipSkill,
        unequipSkill: state.unequipSkill,
    }));

    const learnedActiveSkills = gameData.talents.filter(talent =>
        talent.type === 'actif' &&
        (player.talents[talent.id] || 0) > 0
    );

    const availableSkills = learnedActiveSkills.filter(skill => !player.equippedSkills.includes(skill.id));
    const equippedSkills = player.equippedSkills.map(skillId => skillId ? gameData.talents.find(t => t.id === skillId) : null);

    function handleDragEnd(event: DragEndEvent) {
        const { over, active } = event;
        if (over && typeof over.id === 'string' && over.id.startsWith('slot-')) {
            const slotIndex = parseInt(over.id.replace('slot-', ''), 10);
            const skillId = active.id as string;
            equipSkill(skillId, slotIndex);
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Compétences</CardTitle>
                <CardDescription>Équipez les compétences à utiliser en combat. Faites glisser une compétence de la liste vers un emplacement.</CardDescription>
            </CardHeader>
            <CardContent>
                <DndContext onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-4 text-center">Compétences Disponibles</h3>
                            <div className="space-y-2 p-4 rounded-lg bg-background/50 min-h-[200px]">
                                {availableSkills.length > 0 ? availableSkills.map(skill => (
                                    <DraggableSkill key={skill.id} id={skill.id}>
                                        <Zap className="h-4 w-4 text-yellow-400" />
                                        <span>{skill.nom}</span>
                                    </DraggableSkill>
                                )) : <p className="text-center text-sm text-muted-foreground pt-8">Aucune compétence disponible.</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-4 text-center">Barre d'Action</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {equippedSkills.map((skill, index) => (
                                    <DroppableSlot key={index} id={`slot-${index}`} isOccupied={!!skill}>
                                        {skill ? (
                                            <div className="relative w-full h-full p-2 border rounded-md bg-card/80 flex items-center justify-center text-center">
                                                <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-6 w-6" onClick={() => unequipSkill(index)}>
                                                    <XCircle className="h-4 w-4 text-red-500" />
                                                </Button>
                                                <div className="flex flex-col items-center gap-1">
                                                     <Zap className="h-5 w-5 text-yellow-400" />
                                                     <span className="text-xs">{skill.nom}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Vide</span>
                                        )}
                                    </DroppableSlot>
                                ))}
                            </div>
                        </div>
                    </div>
                </DndContext>
            </CardContent>
        </Card>
    );
}
