import { useEffect, useState } from "react";
import "./App.css";
import { lesson001 } from "./data/lesson001";
import { lesson002 } from "./data/lesson002";
import { VocabularySection } from "./components/VocabularySection";
import { ListeningSection } from "./components/ListeningSection";
import { PracticeSection } from "./components/PracticeSection";
import { FinalListeningSection } from "./components/FinalListeningSection";

const LESSONS = {
  lesson001,
  lesson002,
};

const LESSON_OPTIONS = [
  { id: "lesson001", label: "Lesson 001" },
  { id: "lesson002", label: "Lesson 002" },
];

function App() {
  const [lessonId, setLessonId] = useState("lesson002");
  const lesson = LESSONS[lessonId];

  useEffect(() => {
    function blockButtonContextMenu(event) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.closest(".word-line")) return;
      event.preventDefault();
    }

    document.addEventListener("contextmenu", blockButtonContextMenu);
    return () => document.removeEventListener("contextmenu", blockButtonContextMenu);
  }, []);

  return (
    <div className="app">
      <header className="hero">
        <label className="lesson-picker">
          <span className="lesson-picker-label">Course</span>
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            aria-label="Select lesson"
          >
            {LESSON_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {lesson.headerImageUrl && (
          <img
            className="hero-header-image"
            src={lesson.headerImageUrl}
            alt="F-22 demonstration team pilot interviewed at Homestead air show"
          />
        )}
        <h1>{lesson.title}</h1>
        <p className="hero-subtitle">{lesson.subtitle}</p>
        {lesson.briefing && (
          <div className="hero-briefing-wrap">
            {lesson.briefingDate && (
              <time className="hero-briefing-date" dateTime="2026-05-23">
                {lesson.briefingDate}
              </time>
            )}
            <p className="hero-briefing">{lesson.briefing}</p>
          </div>
        )}
      </header>

      <main className="layout" key={lessonId}>
        <VocabularySection lesson={lesson} />
        <ListeningSection lesson={lesson} title="2. First Listening" />
        <PracticeSection lesson={lesson} />
        <FinalListeningSection lesson={lesson} />
      </main>
    </div>
  );
}

export default App;
