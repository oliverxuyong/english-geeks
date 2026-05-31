import { useEffect, useRef } from "react";

/**
 * Inline video with first-frame preview on iOS (playsInline + optional poster).
 */
export function InlineLessonVideo({ src, poster }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    function primeFirstFrame() {
      if (!video.paused || video.readyState < 2) return;
      if (video.currentTime < 0.01) {
        video.currentTime = 0.01;
      }
    }

    video.addEventListener("loadeddata", primeFirstFrame);
    if (video.readyState >= 2) primeFirstFrame();

    return () => video.removeEventListener("loadeddata", primeFirstFrame);
  }, [src]);

  return (
    <video
      ref={ref}
      className="full-video"
      controls
      playsInline
      preload="auto"
      poster={poster || undefined}
      src={src}
    >
      <track kind="captions" />
    </video>
  );
}
