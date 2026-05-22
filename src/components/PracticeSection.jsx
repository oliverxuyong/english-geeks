import { useCallback, useEffect, useRef, useState } from "react";
import { PracticeCard } from "./PracticeCard";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

const MIN_SWIPE = 60;
const AXIS_LOCK_THRESHOLD = 10;
const FULL_TEXT_LONG_PRESS_MS = 1500;

export function PracticeSection({ lesson }) {
  const [activeLevel, setActiveLevel] = useState("intermediate");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showIPA, setShowIPA] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [fullTextPinned, setFullTextPinned] = useState(false);
  const fullTextPressTimerRef = useRef(null);
  const fullTextLockedRef = useRef(false);
  const skipHideOnClickRef = useRef(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [matchedWordIndexes, setMatchedWordIndexes] = useState(() => new Set());
  const touchStartRef = useRef(null);
  const swipeAxisRef = useRef(null);

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

  const clearFullText = useCallback(() => {
    if (fullTextPressTimerRef.current) {
      clearTimeout(fullTextPressTimerRef.current);
      fullTextPressTimerRef.current = null;
    }
    fullTextLockedRef.current = false;
    skipHideOnClickRef.current = false;
    setShowFullText(false);
    setFullTextPinned(false);
  }, []);

  const clearSentenceState = useCallback(() => {
    setSelectedWord(null);
    clearFullText();
    setMatchedWordIndexes(new Set());
    stopSpeaking();
  }, [clearFullText, stopSpeaking]);

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
    clearFullText();
    setMatchedWordIndexes(new Set());
    setActiveLevel(newLevel);
  }

  const handleFullTextPressStart = useCallback(
    (event) => {
      event.stopPropagation();
      if (fullTextPinned) return;

      setShowFullText(true);
      if (fullTextPressTimerRef.current) {
        clearTimeout(fullTextPressTimerRef.current);
      }
      fullTextPressTimerRef.current = setTimeout(() => {
        fullTextPressTimerRef.current = null;
        fullTextLockedRef.current = true;
        skipHideOnClickRef.current = true;
        setFullTextPinned(true);

        const finishLongPressGesture = () => {
          requestAnimationFrame(() => {
            skipHideOnClickRef.current = false;
          });
        };
        window.addEventListener("mouseup", finishLongPressGesture, { once: true });
        window.addEventListener("touchend", finishLongPressGesture, { once: true });
        window.addEventListener("pointerup", finishLongPressGesture, { once: true });
      }, FULL_TEXT_LONG_PRESS_MS);
    },
    [fullTextPinned],
  );

  const handleFullTextPressEnd = useCallback(
    (event) => {
      event.stopPropagation();
      if (fullTextLockedRef.current) return;

      if (fullTextPressTimerRef.current) {
        clearTimeout(fullTextPressTimerRef.current);
        fullTextPressTimerRef.current = null;
        setShowFullText(false);
      }
    },
    [],
  );

  const handleFullTextClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (skipHideOnClickRef.current) {
        skipHideOnClickRef.current = false;
        return;
      }
      if (fullTextPinned) {
        clearFullText();
      }
    },
    [clearFullText, fullTextPinned],
  );

  function goToPreviousLevel() {
    const idx = LEVELS.findIndex((l) => l.id === activeLevel);
    if (idx > 0) changeLevel(LEVELS[idx - 1].id);
  }

  function goToNextLevel() {
    const idx = LEVELS.findIndex((l) => l.id === activeLevel);
    if (idx < LEVELS.length - 1) changeLevel(LEVELS[idx + 1].id);
  }

  useEffect(() => {
    function handleDocumentTouchMove(event) {
      const touchStart = touchStartRef.current;
      if (!touchStart) return;

      const t = event.touches[0];
      if (!t) return;

      const deltaX = t.clientX - touchStart.x;
      const deltaY = t.clientY - touchStart.y;

      if (swipeAxisRef.current === null) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        if (absX < AXIS_LOCK_THRESHOLD && absY < AXIS_LOCK_THRESHOLD) return;
        swipeAxisRef.current = absX > absY ? "horizontal" : "vertical";
      }

      if (swipeAxisRef.current === "horizontal") {
        event.preventDefault();
      }
    }

    document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false });
    return () => document.removeEventListener("touchmove", handleDocumentTouchMove);
  }, []);

  function clearTouchGesture() {
    touchStartRef.current = null;
    swipeAxisRef.current = null;
  }

  function handleTouchStart(event) {
    const t = event.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    swipeAxisRef.current = null;
  }

  function handleTouchEnd(event) {
    const touchStart = touchStartRef.current;
    if (!touchStart) return;

    const t = event.changedTouches[0];
    const deltaX = t.clientX - touchStart.x;
    const deltaY = t.clientY - touchStart.y;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= MIN_SWIPE) {
      if (deltaX < 0) goToPreviousLevel();
      else goToNextLevel();
    }

    clearTouchGesture();
  }

  function handleTouchCancel() {
    clearTouchGesture();
  }

  return (
    <section className="panel" id="step-practice">
      <h2>3. Practice</h2>

      <div className="practice-section">
        <PracticeCard
          level={activeLevel}
          onLevelChange={changeLevel}
          sentence={sentence}
          sentenceCount={lesson.sentences.length}
          showTranslation={showTranslation}
          onToggleTranslation={() => setShowTranslation((v) => !v)}
          showIPA={showIPA}
          onToggleIPA={() => setShowIPA((v) => !v)}
          showFullText={showFullText}
          fullTextPinned={fullTextPinned}
          onFullTextPressStart={handleFullTextPressStart}
          onFullTextPressEnd={handleFullTextPressEnd}
          onFullTextClick={handleFullTextClick}
          selectedWord={selectedWord}
          setSelectedWord={setSelectedWord}
          recognizedText={recognizedText}
          matchedWordIndexes={matchedWordIndexes}
          isListening={isListening}
          attemptEnded={attemptEnded}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        />

        <div className="button-row navigation-row">
          <button type="button" onClick={goPrevious} disabled={sentenceIndex === 0}>
            Prev
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
