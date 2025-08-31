'use client';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import EntityDisplay from './components/EntityDisplay';
import { useMemo, useRef, createRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
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

  const isBossFight = enemies.length === 1 && enemies[0].isBoss;

  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
  enemyRefs.current = enemies.map((_, i) => enemyRefs.current[i] ?? createRef());

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

  const playerClass = useMemo(() => {
    if (!player?.classeId) return null;
    return gameData.classes.find(c => c.id === player.classeId);
    }, [player?.classeId, gameData.classes]);

  if (!currentDungeon) {
    return <div className="flex items-center justify-center h-screen">Chargement du donjon...</div>;
  }

  if (enemies.length === 0 && killCount < currentDungeon.killTarget) {
    return <div className="flex items-center justify-center h-screen">Recherche d&apos;une cible...</div>;
  }

  const dungeonIndex = parseInt(currentDungeon.id.split('_')[1]);

  return (
    <div
      className="flex flex-col h-screen w-full font-code text-foreground relative bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/biome${dungeonIndex}.png')`,
      }}
    >
      <header className="flex-shrink-0 flex items-center border-b p-2 md:p-4 gap-4">
        <Button variant="ghost" size="icon" onClick={flee} className="flex-shrink-0">
            <ArrowLeft />
        </Button>
        <div ref={playerRef} className="flex-grow">
             <EntityDisplay entity={player} isPlayer attackProgress={playerAttackProgress} dungeonInfo={<DungeonInfo dungeon={currentDungeon} killCount={killCount} />} classImage={playerClass?.image} />
        </div>
      </header>

      <main className="flex-grow p-4 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-row gap-4 pr-4">
            {enemies.map((enemy, index) => (
              <div key={enemy.id} ref={enemyRefs.current[index]} onClick={() => setTargetIndex(index)} className="cursor-pointer flex-1">
                <EntityDisplay entity={enemy} isTarget={index === targetIndex} image={enemy.image} />
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
                        left: rect.left + rect.width / 2,
                        top: rect.bottom,
                        transform: 'translateX(-50%)',
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
        <AlertDialogContent
          className="bg-transparent text-white border-yellow-500"
          style={{
            backgroundImage: `url('/images/boss_biome${parseInt(currentDungeon.id.split('_')[1])}.png')`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-black/60 z-0" />
          <div className="relative z-10">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive text-4xl font-display text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    {bossEncounter?.nom} apparaît !
                </AlertDialogTitle>
                <AlertDialogDescription className="text-center text-gray-300">
                    Préparez-vous au combat ! Le gardien de ce donjon est là.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogAction className="w-full" onClick={() => setBossEncounter(null)}>Combattre !</AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
