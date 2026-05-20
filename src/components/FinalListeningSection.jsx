import { useStoppableAudio } from "../hooks/useStoppableAudio";

export function FinalListeningSection({ lesson }) {
  const { isPlaying, toggle } = useStoppableAudio(lesson.fullAudioUrl, {
    onError: () => alert("Full audio is not available yet."),
  });

  return (
    <section className="panel" id="step-listen-2">
      <h2>4. Final Listening</h2>
      {lesson.fullVideoUrl ? (
        <video className="full-video" controls src={lesson.fullVideoUrl}>
          <track kind="captions" />
        </video>
      ) : (
        <button type="button" onClick={toggle}>
          {isPlaying ? "Stop Playing" : "Play Again"}
        </button>
      )}
    </section>
  );
}
