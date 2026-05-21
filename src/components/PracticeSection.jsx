import { useCallback, useState } from "react";
import { PracticeCard } from "./PracticeCard";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const MIN_SWIPE = 60;

export function PracticeSection({ lesson }) {
  const [activeLevel, setActiveLevel] = useState("intermediate");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showIPA, setShowIPA] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [matchedWordIndexes, setMatchedWordIndexes] = useState(() => new Set());
  const [touchStart, setTouchStart] = useState(null);

  const sentence = lesson.sentences[sentenceIndex];

  const {
    recognizedText,
    isListening,
    attemptEnded,
    startSpeaking,
    stopSpeaking,
  } = useSpeechRecognition({
    words: sentence.words,
    onMatchUpdate: setMatchedWordIndexes,
  });

  const clearSentenceState = useCallback(() => {
    setSelectedWord(null);
    setShowFullText(false);
    setMatchedWordIndexes(new Set());
    stopSpeaking();
  }, [stopSpeaking]);

  function goPrevious() {
    clearSentenceState();
    setSentenceIndex((i) => (i === 0 ? i : i - 1));
  }

  function goNext() {
    clearSentenceState();
    setSentenceIndex((i) => (i >= lesson.sentences.length - 1 ? i : i + 1));
  }

  function changeLevel(newLevel) {
    setSelectedWord(null);
    setShowFullText(false);
    setMatchedWordIndexes(new Set());
    setActiveLevel(newLevel);
  }

  function goToPreviousLevel() {
    const idx = LEVELS.findIndex((l) => l.id === activeLevel);
    if (idx > 0) changeLevel(LEVELS[idx - 1].id);
  }

  function goToNextLevel() {
    const idx = LEVELS.findIndex((l) => l.id === activeLevel);
    if (idx < LEVELS.length - 1) changeLevel(LEVELS[idx + 1].id);
  }

  function handleTouchStart(event) {
    const t = event.touches[0];
    setTouchStart({ x: t.clientX, y: t.clientY });
  }

  function handleTouchEnd(event) {
    if (!touchStart) return;

    const t = event.changedTouches[0];
    const deltaX = t.clientX - touchStart.x;
    const deltaY = t.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= MIN_SWIPE) {
      if (deltaX < 0) goToNextLevel();
      else goToPreviousLevel();
    }

    setTouchStart(null);
  }

  return (
    <section className="panel" id="step-practice">
      <h2>3. Practice</h2>

      <div className="practice-section">
        <div className="level-tabs" role="tablist" aria-label="Practice level">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={activeLevel === level.id}
              className={`level-tab ${activeLevel === level.id ? "level-tab-active" : ""}`}
              onClick={() => changeLevel(level.id)}
            >
              {level.label}
            </button>
          ))}
        </div>

        <PracticeCard
          level={activeLevel}
          sentence={sentence}
          sentenceCount={lesson.sentences.length}
          showTranslation={showTranslation}
          onToggleTranslation={() => setShowTranslation((v) => !v)}
          showIPA={showIPA}
          onToggleIPA={() => setShowIPA((v) => !v)}
          showFullText={showFullText}
          onFullTextPressStart={() => setShowFullText(true)}
          onFullTextPressEnd={() => setShowFullText(false)}
          selectedWord={selectedWord}
          setSelectedWord={setSelectedWord}
          recognizedText={recognizedText}
          matchedWordIndexes={matchedWordIndexes}
          isListening={isListening}
          attemptEnded={attemptEnded}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        <div className="button-row navigation-row">
          <button type="button" onClick={goPrevious} disabled={sentenceIndex === 0}>
            Previous
          </button>
          <button
            type="button"
            className="nav-speak-button"
            onClick={isListening ? stopSpeaking : startSpeaking}
          >
            {isListening ? "Stop" : "Speak"}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={sentenceIndex === lesson.sentences.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
