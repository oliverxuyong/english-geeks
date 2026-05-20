import { useEffect, useRef, useState } from "react";
import { playMediaUrl, releaseAudio, subscribePlaybackStop } from "../utils/playAudio";

export function useStoppableAudio(url, { onError } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      releaseAudio(audioRef.current);
      audioRef.current = null;
    }
    setIsPlaying(false);
  }

  useEffect(() => subscribePlaybackStop(stop), []);

  function toggle() {
    if (isPlaying) {
      stop();
      return;
    }

    audioRef.current = playMediaUrl(url, {
      onEnded: stop,
      onError: () => {
        stop();
        onError?.();
      },
    });
    if (audioRef.current) setIsPlaying(true);
  }

  return { isPlaying, toggle, stop };
}
