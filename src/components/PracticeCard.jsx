import { useEffect, useRef, useState } from "react";
import { toggleSpeakWord } from "../utils/playAudio";
import { BLANK_PLACEHOLDER, buildWordCharSlots } from "../utils/formatBlankDisplay";
import { calculateMatchScore } from "../utils/lcsMatch";
import { buildSentenceDisplayGroups } from "../utils/sentenceDisplay";

const WORD_PEEK_MS = 700;

const LEVEL_OPTIONS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

export function PracticeCard({
  level,
  onLevelChange,
  sentence,
  sentenceCount,
  showTranslation,
  onToggleTranslation,
  showIPA,
  onToggleIPA,
  showFullText,
  fullTextPinned,
  onFullTextPressStart,
  onFullTextPressEnd,
  onFullTextClick,
  selectedWord,
  setSelectedWord,
  recognizedText,
  matchedWordIndexes,
  isListening,
  attemptEnded,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
}) {
  const matchScore = calculateMatchScore(sentence.words, matchedWordIndexes);
  const [peekWordId, setPeekWordId] = useState(null);
  const peekTimeoutRef = useRef(null);

  useEffect(() => {
    setPeekWordId(null);
    if (peekTimeoutRef.current) {
      clearTimeout(peekTimeoutRef.current);
      peekTimeoutRef.current = null;
    }
  }, [sentence.id]);

  useEffect(
    () => () => {
      if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    },
    [],
  );

  function startWordPeek(word) {
    setPeekWordId(word.id);
    if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
    peekTimeoutRef.current = setTimeout(() => {
      setPeekWordId(null);
      peekTimeoutRef.current = null;
    }, WORD_PEEK_MS);
  }

  function handleWordClick(word) {
    startWordPeek(word);
  }

  function handleWordDoubleClick(word) {
    setSelectedWord(word);
    startWordPeek(word);
  }

  return (
    <div
      className="practice-card single-practice-card"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div className="practice-card-top">
        <div className="practice-card-toolbar">
          <button
            type="button"
            onClick={fullTextPinned ? onFullTextClick : undefined}
            onMouseDown={fullTextPinned ? undefined : onFullTextPressStart}
            onMouseUp={fullTextPinned ? undefined : onFullTextPressEnd}
            onMouseLeave={fullTextPinned ? undefined : onFullTextPressEnd}
            onTouchStart={fullTextPinned ? undefined : onFullTextPressStart}
            onTouchEnd={fullTextPinned ? undefined : onFullTextPressEnd}
            onTouchCancel={fullTextPinned ? undefined : onFullTextPressEnd}
          >
            {fullTextPinned ? "Hide F.Txt" : "Full Text"}
          </button>

          <button type="button" onClick={onToggleTranslation}>
            {showTranslation ? "Hide Trans." : "Show Trans."}
          </button>

          <button type="button" onClick={onToggleIPA}>
            {showIPA ? "Hide IPA" : "Show IPA"}
          </button>
        </div>
      </div>

      <div className="practice-card-header">
        <div className="practice-card-header-right">
          {sentence.audioUrl && (
            <div className="sentence-audio-buttons">
              <button
                type="button"
                className="play-icon play-icon-small"
                aria-label="Play sentence audio at half speed"
                onClick={() =>
                  toggleSpeakWord(sentence.english, sentence.audioUrl, { playbackRate: 0.5 })
                }
              >
                🐢
              </button>
              <button
                type="button"
                className="play-icon play-icon-small"
                aria-label="Play sentence audio"
                onClick={() => toggleSpeakWord(sentence.english, sentence.audioUrl)}
              >
                🔊
              </button>
            </div>
          )}
          <p className="sentence-index">
            Sentence {sentence.index} / {sentenceCount}
          </p>
        </div>
      </div>

      <div className="practice-card-level" role="tablist" aria-label="Practice level">
        {LEVEL_OPTIONS.map((opt) => {
          const isActive = level === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`practice-level-segment practice-level-segment--${opt.id} ${
                isActive ? "is-active" : "is-inactive"
              }`}
              onClick={() => onLevelChange(opt.id)}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {isActive && opt.id === "intermediate" && (
                <span className="practice-level-arrow" aria-hidden="true">
                  ←
                </span>
              )}
              {isActive && opt.id === "advanced" && (
                <span className="practice-level-arrow" aria-hidden="true">
                  ←
                </span>
              )}
              <span className="practice-level-label">{opt.label}</span>
              {isActive && opt.id === "beginner" && (
                <span className="practice-level-arrow" aria-hidden="true">
                  →
                </span>
              )}
              {isActive && opt.id === "intermediate" && (
                <span className="practice-level-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showTranslation && <p className="translation">{sentence.chinese}</p>}

      <div className="word-line">
        {buildSentenceDisplayGroups(sentence).map((group) => {
          if (group.type === "punct-only") {
            return (
              <span className="word-punct" key={`punct-${group.text}`}>
                {group.text}
              </span>
            );
          }

          const { word, wordIndex, leadingPunct, trailingPunct, tightLeft } = group;
          const isMatched = matchedWordIndexes.has(wordIndex);
          const reveal = showFullText || isMatched || peekWordId === word.id;
          const slots = buildWordCharSlots(
            word.text,
            sentence.blanks[level][wordIndex],
          );

          return (
            <div
              className={`word-column${tightLeft ? " word-column-tight-left" : ""}`}
              key={word.id}
            >
              {showIPA && word.ipa && <span className="word-ipa">{word.ipa}</span>}
              <span className="word-token-row">
                {leadingPunct.map((punct, i) => (
                  <span className="word-punct" key={`${word.id}-lead-${i}`}>
                    {punct}
                  </span>
                ))}
                <button
                  className={`word-token word-token-slotted ${
                    selectedWord?.id === word.id ? "word-token-selected" : ""
                  } ${isMatched ? "word-token-matched" : ""}`}
                  type="button"
                  onClick={() => handleWordClick(word)}
                  onDoubleClick={() => handleWordDoubleClick(word)}
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
                {trailingPunct.map((punct, i) => (
                  <span className="word-punct" key={`${word.id}-trail-${i}`}>
                    {punct}
                  </span>
                ))}
              </span>
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
            <strong>En：</strong>
            {selectedWord.english || "—"}
          </p>
          <p>
            <strong>中：</strong>
            {selectedWord.chinese || "—"}
          </p>

        </div>
      )}
    </div>
  );
}
