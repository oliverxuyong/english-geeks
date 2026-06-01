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
      <p className="vocab-intro">
        先把生词扫荡一遍，免得后面卡壳。如果除了这些词之外，你还有不懂的，可以下面第3步的练习区里直接双击它，会弹出一个简短释义。
      </p>

      <div className="vocab-list">
        {lesson.vocabulary.map((item, index) => (
          <div className="vocab-card" key={item.id}>
            <div className="vocab-card-top">
              <h3>
                {index + 1}. {item.word}
              </h3>
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
              <strong>En: </strong>
              {item.english}.
            </p>
            <p>
              <strong>中: </strong>
              {item.chinese}。本文中指{item.meaningInContext}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
