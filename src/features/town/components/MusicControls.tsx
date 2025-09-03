'use client';

import { useGameStore } from '@/state/gameStore';
import { Button } from '@/components/ui/button';
import { FaPlay, FaStepBackward, FaStepForward } from 'react-icons/fa';

// Helper to extract a clean track name from the path
const getTrackName = (path: string | undefined): string => {
  if (!path) return 'No music playing';
  try {
    // Decode URI component to handle special characters like %20 for space
    const decodedPath = decodeURIComponent(path);
    // Get the part after the last '/'
    const fileName = decodedPath.split('/').pop() || '';
    // Remove the extension and the leading number/underscore
    const trackName = fileName.replace(/\.[^/.]+$/, "").replace(/^\d+_/g, '').replace(/_/g, ' ');
    return trackName;
  } catch (e) {
    console.error("Error parsing track name:", e);
    return 'Unknown Track';
  }
};

const MusicControls = () => {
  const { 
    currentMusicTracks, 
    currentTrackIndex, 
    nextTrack, 
    previousTrack 
  } = useGameStore(state => ({
    currentMusicTracks: state.currentMusicTracks,
    currentTrackIndex: state.currentTrackIndex,
    nextTrack: state.nextTrack,
    previousTrack: state.previousTrack,
  }));

  const currentTrack = currentMusicTracks[currentTrackIndex];
  const trackName = getTrackName(currentTrack);

  // Don't render anything if there's no music playlist
  if (!currentMusicTracks || currentMusicTracks.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 bg-opacity-75 text-white p-3 rounded-lg shadow-lg flex items-center space-x-4 z-50">
      <FaPlay className="text-green-400" />
      <div className="flex-grow min-w-0">
        <p className="text-sm font-bold truncate" title={trackName}>
          {trackName}
        </p>
      </div>
      {currentMusicTracks.length > 1 && (
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={previousTrack} className="text-white hover:bg-gray-700">
            <FaStepBackward />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextTrack} className="text-white hover:bg-gray-700">
            <FaStepForward />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MusicControls;
