import { useStoppableAudio } from "../hooks/useStoppableAudio";

export function ListeningSection({ lesson, stepId = "step-listen-1", title }) {
  const { isPlaying, toggle } = useStoppableAudio(lesson.fullAudioUrl, {
    onError: () => {
      alert(
        "Full audio is not available yet. Run the lesson build pipeline or add full.mp3 under public/lessons/."
      );
    },
  });

  return (
    <section className="panel" id={stepId}>
      <h2>{title}</h2>
      <button type="button" onClick={toggle}>
        {isPlaying ? "Stop Playing" : "Play Full Audio"}
      </button>
      <p className="listen-hint">Listen once to test yourself before practice.</p>
    </section>
  );
}
