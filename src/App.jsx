import { useState } from "react";
import "./App.css";
import { lesson001 } from "./data/lesson001";
import { findMatchedWordIndexes, calculateMatchScore } from "./utils/lcsMatch";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

function App() {
  const lesson = lesson001;

  return (
    <div className="app">
      <header className="hero">
        <h1>{lesson.title}</h1>
        <p>{lesson.subtitle}</p>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>1. Vocabulary</h2>

          <div className="vocab-list">
            {lesson.vocabulary.map((item) => (
              <div className="vocab-card" key={item.id}>
                <h3>{item.word}</h3>
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

        <section className="panel">
          <h2>2. First Listening</h2>
          <button>Play Full Audio</button>
        </section>

        <section className="panel">
          <h2>3. Practice</h2>
          <PracticeSection lesson={lesson} />
        </section>

        <section className="panel">
          <h2>4. Final Listening</h2>
          <button>Play Again</button>
        </section>
      </main>
    </div>
  );
}

function PracticeSection({ lesson }) {
  const [activeLevel, setActiveLevel] = useState("intermediate");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [showIPA, setShowIPA] = useState(true);
  const [showFullText, setShowFullText] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [matchedWordIndexes, setMatchedWordIndexes] = useState(() => new Set());
  const sentence = lesson.sentences[sentenceIndex];
  const matchScore = calculateMatchScore(sentence.words, matchedWordIndexes);

  function clearSentenceState() {
    setSelectedWord(null);
    setRecognizedText("");
    setShowFullText(false);
    setMatchedWordIndexes(new Set());
  }

  function goPrevious() {
    clearSentenceState();

    setSentenceIndex((currentIndex) => {
      if (currentIndex === 0) {
        return currentIndex;
      }

      return currentIndex - 1;
    });
  }

  function goNext() {
    clearSentenceState();

    setSentenceIndex((currentIndex) => {
      if (currentIndex === lesson.sentences.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  }

  function changeLevel(newLevel) {
    clearSentenceState();
    setActiveLevel(newLevel);
  }

  function goToPreviousLevel() {
    const currentLevelIndex = LEVELS.findIndex((level) => level.id === activeLevel);

    if (currentLevelIndex > 0) {
      changeLevel(LEVELS[currentLevelIndex - 1].id);
    }
  }

  function goToNextLevel() {
    const currentLevelIndex = LEVELS.findIndex((level) => level.id === activeLevel);

    if (currentLevelIndex < LEVELS.length - 1) {
      changeLevel(LEVELS[currentLevelIndex + 1].id);
    }
  }

  function handleTouchStart(event) {
    setTouchStartX(event.touches[0].clientX);
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) {
      return;
    }

    const touchEndX = event.changedTouches[0].clientX;
    const distance = touchEndX - touchStartX;
    const minimumSwipeDistance = 60;

    if (distance > minimumSwipeDistance) {
      goToPreviousLevel();
    }

    if (distance < -minimumSwipeDistance) {
      goToNextLevel();
    }

    setTouchStartX(null);
  }

  function startSpeaking() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome.");
      return;
    }

    setRecognizedText("");
    setIsListening(true);

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setRecognizedText(transcript);

      const matches = findMatchedWordIndexes(sentence.words, transcript);
      setMatchedWordIndexes(matches);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  return (
    <div className="practice-section">
      <div className="level-tabs" role="tablist" aria-label="Practice level">
        {LEVELS.map((level) => (
          <button
            key={level.id}
            type="button"
            className={`level-tab ${activeLevel === level.id ? "level-tab-active" : ""}`}
            onClick={() => changeLevel(level.id)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="practice-toolbar">
        <button onClick={startSpeaking} disabled={isListening}>
          {isListening ? "Listening..." : "Speak"}
        </button>

        <button
          onMouseDown={() => setShowFullText(true)}
          onMouseUp={() => setShowFullText(false)}
          onMouseLeave={() => setShowFullText(false)}
          onTouchStart={() => setShowFullText(true)}
          onTouchEnd={() => setShowFullText(false)}
        >
          Full Text
        </button>

        <button onClick={() => setShowTranslation((current) => !current)}>
          {showTranslation ? "Hide Trans." : "Show Trans."}
        </button>

        <button onClick={() => setShowIPA((current) => !current)}>
          {showIPA ? "Hide IPA" : "Show IPA"}
        </button>
      </div>

      <PracticeCard
        level={activeLevel}
        sentence={sentence}
        sentenceCount={lesson.sentences.length}
        showTranslation={showTranslation}
        showIPA={showIPA}
        showFullText={showFullText}
        selectedWord={selectedWord}
        setSelectedWord={setSelectedWord}
        recognizedText={recognizedText}
        matchedWordIndexes={matchedWordIndexes}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      <div className="button-row navigation-row">
        <button onClick={goPrevious} disabled={sentenceIndex === 0}>
          Previous
        </button>

        <button
          onClick={goNext}
          disabled={sentenceIndex === lesson.sentences.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function PracticeCard({
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
  onTouchStart,
  onTouchEnd,
}) {
  return (
    <div
      className="practice-card single-practice-card"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="practice-card-header">
        <h3>{capitalize(level)}</h3>

        <p className="sentence-index">
          Sentence {sentence.index} / {sentenceCount}
        </p>
      </div>

      {showTranslation && <p className="translation">{sentence.chinese}</p>}

      {showIPA && <p className="ipa">{sentence.ipa}</p>}

      <div className="word-line">
        {sentence.words.map((word, wordIndex) => {
          const isMatched = matchedWordIndexes.has(wordIndex);

          const displayText =
            showFullText || isMatched
              ? word.text
              : sentence.blanks[level][wordIndex];

          return (
            <button
              className={`word-token ${selectedWord?.id === word.id ? "word-token-selected" : ""
                } ${isMatched ? "word-token-matched" : ""}`}
              key={word.id}
              type="button"
              onClick={() => setSelectedWord(word)}
            >
              {displayText}
            </button>
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

          <p className="ipa">{selectedWord.ipa}</p>

          <p>
            <strong>中文：</strong>
            {selectedWord.chinese}
          </p>

          <p>
            <strong>English：</strong>
            {selectedWord.english}
          </p>
        </div>
      )}

      {recognizedText && (
        <div className="recognized-box">
          <strong>Recognized:</strong>
          <p>{recognizedText}</p>
        </div>
      )}
    </div>
  );
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default App;