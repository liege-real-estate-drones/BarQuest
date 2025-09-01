'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import AudioPlayer from './AudioPlayer'; // Import the new component

const availableDungeonTracks = ['1'];
const defaultCombatMusic = '/sounds/music/378_Descent.mp3';

const MusicController = () => {
  const { currentTrack, playMusic, stopMusic } = useAudioPlayer();
  const { view, activeSubView, townView, currentDungeon } = useGameStore(state => ({
    view: state.view,
    activeSubView: state.activeSubView,
    townView: state.townView,
    currentDungeon: state.currentDungeon,
  }));

  useEffect(() => {
    let track: string | null = null;

    if (view === 'COMBAT' && currentDungeon) {
      const dungeonId = currentDungeon.id.replace('dungeon_', '').replace('_heroic', '');
      if (availableDungeonTracks.includes(dungeonId)) {
        track = `/sounds/music/donjon${dungeonId}.mp3`;
      } else {
        track = defaultCombatMusic;
      }
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
            track = '/sounds/music/menu_ville.mp3';
            break;
        }
      }
    }

    if (track && track !== currentTrack) {
      playMusic(track);
    } else if (!track) {
      stopMusic();
    }
  }, [view, activeSubView, townView, currentDungeon, playMusic, stopMusic, currentTrack]);

  return <AudioPlayer src={currentTrack} />;
};

export default MusicController;
