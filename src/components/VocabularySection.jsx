import { speakWord } from "../utils/playAudio";

export function VocabularySection({ lesson }) {
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
                className="play-icon"
                aria-label={`Play pronunciation of ${item.word}`}
                onClick={() => speakWord(item.word, item.audioUrl)}
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
