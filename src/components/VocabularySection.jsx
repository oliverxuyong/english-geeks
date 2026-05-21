import { useRef, useState } from "react";
import { primeSpeechVoices, speakWord } from "../utils/playAudio";

export function VocabularySection({ lesson }) {
  const [pressedId, setPressedId] = useState(null);
  const playLock = useRef(false);

  function playVocab(item) {
    if (playLock.current) return;
    playLock.current = true;
    window.setTimeout(() => {
      playLock.current = false;
    }, 400);

    setPressedId(item.id);
    primeSpeechVoices();
    speakWord(item.word, item.audioUrl);
    window.setTimeout(() => setPressedId((id) => (id === item.id ? null : id)), 280);
  }

  return (
    <section className="panel" id="step-vocab">
      <h2>1. Vocabulary</h2>

      <div className="vocab-list">
        {lesson.vocabulary.map((item) => (
          <div className="vocab-card" key={item.id}>
            <div className="vocab-card-top">
              <h3>{item.word}</h3>
              <button
                type="button"
                className={`play-icon${pressedId === item.id ? " is-pressed" : ""}`}
                aria-label={`Play pronunciation of ${item.word}`}
                onClick={() => playVocab(item)}
              >
                🔊
              </button>
            </div>
            <p className="ipa">{item.ipa}</p>
            <p>
              <strong>中文：</strong>
              {item.chinese}
            </p>
            <p>
              <strong>English：</strong>
              {item.english}
            </p>
            <p>
              <strong>In this lesson：</strong>
              {item.meaningInContext}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
