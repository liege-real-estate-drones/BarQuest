'use client';

import { useRef, useEffect, useState } from 'react';

interface AudioPlayerProps {
  src: string | null;
}

const AudioPlayer = ({ src }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
    };

    // Use { once: true } to automatically remove the listeners after they've fired.
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      // Cleanup in case the component unmounts before interaction.
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (src && hasInteracted) {
      // Set the src and play. The browser is smart enough not to reload if the src is the same.
      audio.src = src;
      audio.play().catch(e => {
        // AbortError is expected if the user navigates away while the audio is loading.
        if (e.name !== 'AbortError') {
          console.error("Audio play failed:", e);
        }
      });
    } else {
      // Pause if there's no src or if the user hasn't interacted yet.
      audio.pause();
    }
  }, [src, hasInteracted]);

  return <audio ref={audioRef} loop playsInline />;
};

export default AudioPlayer;
