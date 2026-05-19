import { speakWord } from "../utils/playAudio";
import { calculateMatchScore } from "../utils/lcsMatch";

const LEVEL_LABELS = {
  beginner: "初",
  intermediate: "中",
  advanced: "高",
};

export function PracticeCard({
  level,
  sentence,
  sentenceCount,
  showTranslation,
  showIPA,
  showFullText,
  selectedWord,
  setSelectedWord,
  recognizedText,
  matchedWordIndexes,
  isListening,
  attemptEnded,
  onTouchStart,
  onTouchEnd,
}) {
  const matchScore = calculateMatchScore(sentence.words, matchedWordIndexes);

  return (
    <div
      className="practice-card single-practice-card"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="swipe-hints" aria-hidden="true">
        <span className="swipe-hint swipe-hint-vertical">↑↓ sentence</span>
        <span className="swipe-hint swipe-hint-horizontal">←→ level</span>
      </div>

      <div className="practice-card-header">
        <h3>
          {capitalize(level)} <span className="level-zh">({LEVEL_LABELS[level]})</span>
        </h3>
        <div className="practice-card-header-right">
          {sentence.audioUrl && (
            <button
              type="button"
              className="play-icon play-icon-small"
              aria-label="Play sentence audio"
              onClick={() => speakWord(sentence.english, sentence.audioUrl)}
            >
              🔊
            </button>
          )}
          <p className="sentence-index">
            Sentence {sentence.index} / {sentenceCount}
          </p>
        </div>
      </div>

      {showTranslation && <p className="translation">{sentence.chinese}</p>}

      {(recognizedText || isListening) && (
        <div className={`recognized-box ${attemptEnded ? "recognized-box-attempt-ended" : ""}`}>
          <div className="recognized-header">
            <strong>{isListening ? "Listening…" : "Recognized:"}</strong>
            <span className="match-score">{matchScore}% matched</span>
          </div>
          <p>{recognizedText || "…"}</p>
          {attemptEnded && isListening && (
            <p className="attempt-cue">Pause detected — keep reading or tap Stop.</p>
          )}
        </div>
      )}

      <div className="word-line">
        {sentence.words.map((word, wordIndex) => {
          const isMatched = matchedWordIndexes.has(wordIndex);
          const displayText =
            showFullText || isMatched ? word.text : sentence.blanks[level][wordIndex];

          return (
            <div className="word-column" key={word.id}>
              {showIPA && word.ipa && <span className="word-ipa">{word.ipa}</span>}
              <button
                className={`word-token ${
                  selectedWord?.id === word.id ? "word-token-selected" : ""
                } ${isMatched ? "word-token-matched" : ""}`}
                type="button"
                onClick={() => setSelectedWord(word)}
              >
                {displayText}
              </button>
            </div>
          );
        })}
      </div>

      {selectedWord && (
        <div className="word-popup">
          <div className="word-popup-header">
            <strong>{selectedWord.text}</strong>
            <button
              className="close-button"
              type="button"
              onClick={() => setSelectedWord(null)}
            >
              ×
            </button>
          </div>
          {selectedWord.ipa && <p className="ipa">{selectedWord.ipa}</p>}
          <p>
            <strong>中文：</strong>
            {selectedWord.chinese || "—"}
          </p>
          <p>
            <strong>English：</strong>
            {selectedWord.english || "—"}
          </p>
        </div>
      )}
    </div>
  );
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
