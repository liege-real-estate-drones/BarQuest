import { useState, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);

  const playMusic = useCallback((src: string) => {
    setCurrentTrack(src);
  }, []);

  const stopMusic = useCallback(() => {
    setCurrentTrack(null);
  }, []);

  return { currentTrack, playMusic, stopMusic };
};
