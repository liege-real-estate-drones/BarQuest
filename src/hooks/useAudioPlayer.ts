import { useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<string | null>(null);

  const playMusic = useCallback((src: string) => {
    if (currentTrackRef.current === src) {
      // Don't restart if the same music is already playing
      return;
    }

    console.log(`[AudioPlayer] Attempting to play: ${src}`);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(src);
    audio.loop = true;
    audio.play().catch(error => console.error("Audio play failed:", error));

    audioRef.current = audio;
    currentTrackRef.current = src;
  }, []);

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      console.log(`[AudioPlayer] Stopping music: ${currentTrackRef.current}`);
      audioRef.current.pause();
      audioRef.current = null;
      currentTrackRef.current = null;
    }
  }, []);

  return { playMusic, stopMusic };
};
