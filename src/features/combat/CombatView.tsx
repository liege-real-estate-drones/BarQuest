'use client';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import EntityDisplay from './components/EntityDisplay';
import { useMemo, useRef, createRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ActionStrip } from './components/ActionStrip';
import type { Skill } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DungeonInfo } from './components/DungeonInfo';
import { FloatingCombatText } from './components/FloatingCombatText';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export function CombatView() {
  const {
    player,
    enemies,
    flee,
    currentDungeon,
    killCount,
    gameData,
    cycleTarget,
    setTargetIndex,
    targetIndex,
    bossEncounter,
    setBossEncounter,
    playerAttackProgress,
    skillCooldowns,
    floatingTexts,
    removeFloatingText,
  } = useGameStore((state) => ({
    player: state.player,
    enemies: state.combat.enemies,
    flee: state.flee,
    currentDungeon: state.currentDungeon,
    killCount: state.combat.killCount,
    gameData: state.gameData,
    cycleTarget: state.cycleTarget,
    setTargetIndex: state.setTargetIndex,
    targetIndex: state.combat.targetIndex,
    bossEncounter: state.bossEncounter,
    setBossEncounter: state.setBossEncounter,
    playerAttackProgress: state.combat.playerAttackProgress,
    skillCooldowns: state.combat.skillCooldowns,
    floatingTexts: state.combat.floatingTexts,
    removeFloatingText: state.removeFloatingText,
  }));

  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRefs = useRef(enemies.map(() => createRef<HTMLDivElement>()));

  const equippedSkills = useMemo(() => {
    if (!player?.equippedSkills) return [];
    return player.equippedSkills
      .map(skillId => {
        if (!skillId) return null;
        return gameData.skills.find(t => t.id === skillId) || null;
      })
      .filter((t): t is Skill => t !== null);
  }, [player?.equippedSkills, gameData.skills]);

  const handleCycleTarget = () => {
    cycleTarget();
  };

  if (!currentDungeon) {
    return <div className="flex items-center justify-center h-screen">Chargement du donjon...</div>;
  }

  if (enemies.length === 0 && killCount < currentDungeon.killTarget) {
    return <div className="flex items-center justify-center h-screen">Recherche d&apos;une cible...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full font-code bg-background text-foreground relative">
      <header className="flex-shrink-0 flex items-center border-b p-2 md:p-4 gap-4">
        <Button variant="ghost" size="icon" onClick={flee} className="flex-shrink-0">
            <ArrowLeft />
        </Button>
        <div ref={playerRef} className="flex-grow">
             <EntityDisplay entity={player} isPlayer attackProgress={playerAttackProgress} dungeonInfo={<DungeonInfo dungeon={currentDungeon} killCount={killCount} />} />
        </div>
      </header>

      <main className="flex-grow p-4 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
            {enemies.map((enemy, index) => (
              <div key={enemy.id} ref={enemyRefs.current[index]} onClick={() => setTargetIndex(index)} className="cursor-pointer">
                <EntityDisplay entity={enemy} isTarget={index === targetIndex} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>

      <div className="absolute inset-0 pointer-events-none">
        {floatingTexts.map((ft) => {
            let elementRef: React.RefObject<HTMLDivElement> | null = null;
            if (ft.entityId === player.id) {
                elementRef = playerRef;
            } else {
                const enemyIndex = enemies.findIndex(e => e.id === ft.entityId);
                if (enemyIndex !== -1) {
                    elementRef = enemyRefs.current[enemyIndex];
                }
            }
            const rect = elementRef?.current?.getBoundingClientRect();

            return rect ? (
                <div
                    key={ft.id}
                    style={{
                        position: 'absolute',
                        left: rect.left + rect.width / 2 - 20,
                        top: rect.top,
                    }}
                >
                    <FloatingCombatText
                        text={ft.text}
                        type={ft.type}
                        onAnimationEnd={() => removeFloatingText(ft.id)}
                    />
                </div>
            ) : null;
        })}
      </div>

      <footer className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm p-4">
        <ActionStrip
          onRetreat={flee}
          skills={equippedSkills}
          onCycleTarget={handleCycleTarget}
          skillCooldowns={skillCooldowns}
        />
      </footer>

      {/* AMÉLIORATION: Boîte de dialogue pour l'apparition du boss */}
      <AlertDialog open={!!bossEncounter} onOpenChange={() => setBossEncounter(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive text-2xl">
                    {bossEncounter?.nom} apparaît !
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Préparez-vous au combat ! Le gardien de ce donjon est là.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setBossEncounter(null)}>Combattre !</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
