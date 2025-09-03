'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/state/gameStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import AudioPlayer from './AudioPlayer';
import { musicMapping } from '@/lib/musicMapping';
import { Dungeon } from '@/lib/types';

// This helper function determines the appropriate track or list of tracks based on the game state.
const getMusicTracksForContext = (
  view: string,
  activeSubView: string,
  townView: string,
  currentDungeon: Dungeon | null
): string[] => {
  let tracks: string | string[] | null = null;

  if (view === 'COMBAT') {
    if (currentDungeon) {
      // Prioritize dungeon-specific music
      const specificTrack = musicMapping.dungeonSpecific[currentDungeon.id as keyof typeof musicMapping.dungeonSpecific];
      if (specificTrack) {
        tracks = specificTrack;
      } else {
        // Fallback to biome-specific music
        const biomeTracks = musicMapping.dungeonThemes[currentDungeon.biome as keyof typeof musicMapping.dungeonThemes];
        if (biomeTracks && biomeTracks.length > 0) {
          tracks = biomeTracks;
        }
      }
    }
    // Default combat music if no specific or biome tracks are found
    if (!tracks) {
      tracks = musicMapping.combat.default;
    }
  } else if (view === 'MAIN') {
    if (activeSubView === 'TOWN') {
      switch (townView) {
        case 'CRAFTING':
          tracks = musicMapping.town.crafting;
          break;
        case 'ENCHANTER':
          tracks = musicMapping.town.enchanter;
          break;
        case 'INN':
          tracks = musicMapping.town.inn;
          break;
        default:
          tracks = musicMapping.town.general;
          break;
      }
    } else {
      switch (activeSubView) {
        case 'CHARACTER':
          tracks = musicMapping.menu.character;
          break;
        case 'VENDORS':
          tracks = musicMapping.menu.vendors;
          break;
        case 'DUNGEONS_LIST':
          tracks = musicMapping.menu.dungeons;
          break;
        default:
          tracks = musicMapping.menu.main;
          break;
      }
    }
  }

  if (Array.isArray(tracks)) {
    return tracks;
  }
  if (typeof tracks === 'string') {
    return [tracks];
  }
  return [];
};

const MusicController = () => {
  const { currentTrack, playMusic, stopMusic } = useAudioPlayer();
  const { 
    view, 
    activeSubView, 
    townView, 
    currentDungeon, 
    currentMusicTracks,
    currentTrackIndex,
    setCurrentMusicTracks 
  } = useGameStore(state => ({
    view: state.view,
    activeSubView: state.activeSubView,
    townView: state.townView,
    currentDungeon: state.currentDungeon,
    currentMusicTracks: state.currentMusicTracks,
    currentTrackIndex: state.currentTrackIndex,
    setCurrentMusicTracks: state.setCurrentMusicTracks,
  }));

  // Effect 1: Determine the playlist based on game context
  useEffect(() => {
    const tracks = getMusicTracksForContext(view, activeSubView, townView, currentDungeon);
    // Only update if the playlist is different to avoid unnecessary re-renders and track resets.
    if (JSON.stringify(tracks) !== JSON.stringify(currentMusicTracks)) {
      setCurrentMusicTracks(tracks);
    }
  }, [view, activeSubView, townView, currentDungeon, setCurrentMusicTracks, currentMusicTracks]);

  // Effect 2: Play the correct track when the playlist or the index changes
  useEffect(() => {
    const newTrack = currentMusicTracks[currentTrackIndex] || null;

    if (newTrack && newTrack !== currentTrack) {
      playMusic(newTrack);
    } else if (!newTrack && currentTrack) {
      stopMusic();
    }
  }, [currentMusicTracks, currentTrackIndex, playMusic, stopMusic, currentTrack]);

  return <AudioPlayer src={currentTrack} />;
};

export default MusicController;
