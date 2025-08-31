import { useRef, useCallback, useEffect, useState } from 'react';

export const useAudioPlayer = () => {
  // Initialize audioRef with an Audio object once.
  const audioRef = useRef<HTMLAudioElement | null>(typeof Audio !== 'undefined' ? new Audio() : null);
  const currentTrackRef = useRef<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pendingTrackRef = useRef<string | null>(null);

  // Set properties on the audio element in a useEffect
  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.loop = true;
      const handleError = (e: Event) => {
        const mediaError = (e.target as HTMLAudioElement).error;
        console.error(`[AudioPlayer] Error: ${mediaError?.message} (Code: ${mediaError?.code})`);
      };
      audioEl.addEventListener('error', handleError);
      return () => {
        audioEl.removeEventListener('error', handleError);
      }
    }
  }, []);


  const playNow = useCallback((src: string) => {
    if (!audioRef.current) {
      console.log("[AudioPlayer] Audio element not available.");
      return;
    }

    if (currentTrackRef.current === src && !audioRef.current.paused) {
      return;
    }

    console.log(`[AudioPlayer] Setting track to: ${src}`);

    if (currentTrackRef.current !== src) {
      audioRef.current.src = src;
      currentTrackRef.current = src;
      audioRef.current.load();
    }

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(_ => {
        console.log(`[AudioPlayer] Playback started for: ${src}`);
      }).catch(error => {
        if (error.name !== 'AbortError') {
          console.error(`[AudioPlayer] Playback failed for ${src}:`, error);
        } else {
          console.log(`[AudioPlayer] Playback interrupted. This is normal during quick navigation.`);
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      if (pendingTrackRef.current) {
        console.log("[AudioPlayer] User has interacted, playing pending track.");
        playNow(pendingTrackRef.current);
        pendingTrackRef.current = null;
      }
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
    if (audioRef.current && !audioRef.current.paused) {
      console.log(`[AudioPlayer] Stopping music: ${currentTrackRef.current}`);
      audioRef.current.pause();
      // By setting src to empty string, we effectively stop the music and release the resource.
      // This is a common practice to ensure the audio element is ready for the next track.
      audioRef.current.src = '';
      currentTrackRef.current = null;
    }
  }, []);

  return { playMusic, stopMusic };
};
