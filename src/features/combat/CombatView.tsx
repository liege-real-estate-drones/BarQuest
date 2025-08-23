'use client';
import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { CombatLog } from './components/CombatLog';
import EntityDisplay from './components/EntityDisplay';
import { useMemo } from 'react'; // AMÉLIORATION: 'useEffect' supprimé car il n'est plus utilisé ici
import { ArrowLeft } from 'lucide-react';
import { ActionStrip } from './components/ActionStrip';
import type { Skill } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DungeonInfo } from './components/DungeonInfo';
// AMÉLIORATION: Import des composants pour la boîte de dialogue
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
    startCombat,
    combatLog,
    currentDungeon,
    killCount,
    gameData,
    cycleTarget,
    targetIndex,
    bossEncounter, // NOUVEAU: Récupération de l'état du boss
    setBossEncounter, // NOUVEAU: Récupération de l'action pour le boss
    playerAttackProgress,
    skillCooldowns,
  } = useGameStore((state) => ({
    player: state.player,
    enemies: state.combat.enemies,
    flee: state.flee,
    startCombat: state.startCombat,
    combatLog: state.combat.log,
    currentDungeon: state.currentDungeon,
    killCount: state.combat.killCount,
    gameData: state.gameData,
    cycleTarget: state.cycleTarget,
    targetIndex: state.combat.targetIndex,
    bossEncounter: state.bossEncounter, // NOUVEAU
    setBossEncounter: state.setBossEncounter, // NOUVEAU
    playerAttackProgress: state.combat.playerAttackProgress,
    skillCooldowns: state.combat.skillCooldowns,
  }));

  const equippedSkills = useMemo(() => {
    if (!player?.equippedSkills) return [];
    return player.equippedSkills
      .map(skillId => {
        if (!skillId) return null;
        return gameData.skills.find(t => t.id === skillId) || null;
      })
      .filter((t): t is Skill => t !== null);
  }, [player?.equippedSkills, gameData.skills]);

  // SUPPRIMÉ: Le bloc useEffect a été retiré pour corriger la boucle infinie.
  // La logique de démarrage de combat est maintenant entièrement gérée dans handleEnemyDeath.

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
    <div className="flex flex-col h-screen w-full font-code bg-background text-foreground">
      <header className="flex-shrink-0 flex flex-col md:flex-row items-center border-b p-2 md:p-4 gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={flee} className="flex-shrink-0">
                <ArrowLeft />
            </Button>
            <div className="flex-grow md:hidden">
                <EntityDisplay entity={player} isPlayer isCompact attackProgress={playerAttackProgress} />
            </div>
        </div>
        <div className="flex-grow w-full">
          <DungeonInfo dungeon={currentDungeon} />
        </div>
      </header>

      <main className="flex-grow flex flex-col md:grid md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* --- VUE MOBILE --- */}
        <div className="md:hidden flex flex-col gap-4 min-h-0">
          {/* Ennemis */}
          <div className="grid grid-cols-3 gap-2">
            {enemies.slice(0, 3).map((enemy, index) => (
              <EntityDisplay key={enemy.id} entity={enemy} isTarget={index === targetIndex} isCompact />
            ))}
          </div>

          {/* Log de combat */}
          <div className="flex-grow min-h-0">
            <CombatLog log={combatLog} />
          </div>
        </div>

        {/* --- VUE DESKTOP --- */}
        <div className="hidden md:flex flex-col gap-4 min-h-0">
          <EntityDisplay entity={player} isPlayer />
          <div className="flex-grow min-h-0">
            <CombatLog log={combatLog} />
          </div>
        </div>
        <div className="hidden md:block min-h-0">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-4">
              {enemies.map((enemy, index) => (
                <EntityDisplay key={enemy.id} entity={enemy} isTarget={index === targetIndex} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </main>

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
