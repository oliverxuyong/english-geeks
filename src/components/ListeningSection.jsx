import { useRef, useState } from "react";
import { playMediaUrl } from "../utils/playAudio";

export function ListeningSection({ lesson, stepId = "step-listen-1", title, playOnce = false }) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const audioRef = useRef(null);

  function handlePlay() {
    if (playOnce && hasPlayed) {
      return;
    }

    audioRef.current?.pause();
    audioRef.current = playMediaUrl(lesson.fullAudioUrl, {
      onEnded: () => {
        if (playOnce) setHasPlayed(true);
      },
      onError: () => {
        alert(
          "Full audio is not available yet. Run the lesson build pipeline or add full.mp3 under public/lessons/."
        );
      },
    });
  }

  return (
    <section className="panel" id={stepId}>
      <h2>{title}</h2>
      <button type="button" onClick={handlePlay} disabled={playOnce && hasPlayed}>
        {playOnce && hasPlayed ? "Already played" : "Play Full Audio"}
      </button>
      {playOnce && hasPlayed && (
        <p className="listen-hint">Listen once to test yourself before practice.</p>
      )}
    </section>
  );
}
