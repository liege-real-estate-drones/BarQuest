import { useRef, useCallback, useEffect, useState } from 'react';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pendingTrackRef = useRef<string | null>(null);

  const playNow = useCallback((src: string) => {
    if (currentTrackRef.current === src && audioRef.current && !audioRef.current.paused) {
      return;
    }
    console.log(`[AudioPlayer] Playing: ${src}`);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audio.loop = true;
    audio.play().catch(error => console.error("Audio play failed:", error));
    audioRef.current = audio;
    currentTrackRef.current = src;
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      console.log("[AudioPlayer] User has interacted with the document.");
      setHasInteracted(true);
      if (pendingTrackRef.current) {
        playNow(pendingTrackRef.current);
        pendingTrackRef.current = null;
      }
      // Remove event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [playNow]);

  const playMusic = useCallback((src: string) => {
    if (!hasInteracted) {
      console.log(`[AudioPlayer] Queuing track due to no interaction: ${src}`);
      pendingTrackRef.current = src;
      return;
    }
    playNow(src);
  }, [hasInteracted, playNow]);

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
