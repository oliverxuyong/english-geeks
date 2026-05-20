import { useRef, useState } from "react";
import { playMediaUrl } from "../utils/playAudio";

export function useStoppableAudio(url, { onError } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }

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
