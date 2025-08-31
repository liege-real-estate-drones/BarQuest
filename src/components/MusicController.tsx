'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

const MusicController = () => {
  const { playMusic, stopMusic } = useAudioPlayer();
  const { view, activeSubView, townView, currentDungeon } = useGameStore(state => ({
    view: state.view,
    activeSubView: state.activeSubView,
    townView: state.townView,
    currentDungeon: state.currentDungeon,
  }));

  useEffect(() => {
    let track = null;

    if (view === 'COMBAT' && currentDungeon?.music) {
      track = currentDungeon.music;
    } else if (view === 'MAIN') {
      if (townView === 'CRAFTING') {
        track = '/sounds/music/crafting_theme.mp3';
      } else {
        switch (activeSubView) {
          case 'TOWN':
            track = '/sounds/music/menu_ville.mp3';
            break;
          case 'CHARACTER':
            track = '/sounds/music/menu_personnage.mp3';
            break;
          case 'VENDORS':
            track = '/sounds/music/menu_marchands.mp3';
            break;
          case 'DUNGEONS_LIST':
            track = '/sounds/music/menu_donjons.mp3';
            break;
          default:
            // For other sub-views like Quests, Skills, etc., we can fall back to town music or have none.
            track = '/sounds/music/menu_ville.mp3';
            break;
        }
      }
    }

    if (track) {
      playMusic(track);
    } else {
      // Stop music if no track is determined (e.g., dungeon summary screen)
      stopMusic();
    }
  }, [view, activeSubView, townView, currentDungeon, playMusic, stopMusic]);

  return null; // This is a controller component, it doesn't render anything
};

export default MusicController;
