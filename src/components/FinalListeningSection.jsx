import { useRef } from "react";
import { playMediaUrl } from "../utils/playAudio";

export function FinalListeningSection({ lesson }) {
  const audioRef = useRef(null);

  function handlePlay() {
    audioRef.current?.pause();
    audioRef.current = playMediaUrl(lesson.fullAudioUrl, {
      onError: () => {
        alert("Full audio is not available yet.");
      },
    });
  }

  return (
    <section className="panel" id="step-listen-2">
      <h2>4. Final Listening</h2>
      {lesson.fullVideoUrl ? (
        <video className="full-video" controls src={lesson.fullVideoUrl}>
          <track kind="captions" />
        </video>
      ) : (
        <button type="button" onClick={handlePlay}>
          Play Again
        </button>
      )}
    </section>
  );
}
