import { speakWord } from "../utils/playAudio";
import { BLANK_PLACEHOLDER, buildWordCharSlots } from "../utils/formatBlankDisplay";
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
  onToggleTranslation,
  showIPA,
  onToggleIPA,
  showFullText,
  onFullTextPressStart,
  onFullTextPressEnd,
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
      <div className="practice-card-top">
        <div className="practice-card-toolbar">
          <button
            type="button"
            onMouseDown={onFullTextPressStart}
            onMouseUp={onFullTextPressEnd}
            onMouseLeave={onFullTextPressEnd}
            onTouchStart={onFullTextPressStart}
            onTouchEnd={onFullTextPressEnd}
          >
            Full Text
          </button>

          <button type="button" onClick={onToggleTranslation}>
            {showTranslation ? "Hide Trans." : "Show Trans."}
          </button>

          <button type="button" onClick={onToggleIPA}>
            {showIPA ? "Hide IPA" : "Show IPA"}
          </button>
        </div>

        <span className="swipe-hint swipe-hint-horizontal" aria-hidden="true">
          ←→ level
        </span>
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

      <div className="word-line">
        {sentence.words.map((word, wordIndex) => {
          const isMatched = matchedWordIndexes.has(wordIndex);
          const reveal = showFullText || isMatched;
          const slots = buildWordCharSlots(
            word.text,
            sentence.blanks[level][wordIndex],
          );

          return (
            <div className="word-column" key={word.id}>
              {showIPA && word.ipa && <span className="word-ipa">{word.ipa}</span>}
              <button
                className={`word-token word-token-slotted ${
                  selectedWord?.id === word.id ? "word-token-selected" : ""
                } ${isMatched ? "word-token-matched" : ""}`}
                type="button"
                onClick={() => setSelectedWord(word)}
              >
                {slots.map((slot, charIndex) => (
                  <span
                    key={`${word.id}-${charIndex}`}
                    className={
                      slot.hidden && !reveal ? "word-char word-char-blank" : "word-char"
                    }
                  >
                    {slot.hidden && !reveal ? BLANK_PLACEHOLDER : slot.char}
                  </span>
                ))}
              </button>
            </div>
          );
        })}
      </div>

      {(recognizedText || isListening) && (
        <div className={`recognized-box ${attemptEnded ? "recognized-box-attempt-ended" : ""}`}>
          <div className="recognized-header">
            <strong>{isListening ? "Listening…" : "Recognized:"}</strong>
            <span className="match-score">{matchScore}% matched</span>
          </div>
          {recognizedText ? (
            <p>{recognizedText}</p>
          ) : isListening && !attemptEnded ? (
            <p>…</p>
          ) : null}
          {attemptEnded && isListening && (
            <p className="attempt-cue">Pause detected — keep reading or tap Stop.</p>
          )}
        </div>
      )}

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
