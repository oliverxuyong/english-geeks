import "./App.css";
import { lesson001 } from "./data/lesson001";
import { VocabularySection } from "./components/VocabularySection";
import { ListeningSection } from "./components/ListeningSection";
import { PracticeSection } from "./components/PracticeSection";
import { FinalListeningSection } from "./components/FinalListeningSection";

function App() {
  const lesson = lesson001;

  return (
    <div className="app">
      <header className="hero">
        <h1>{lesson.title}</h1>
        <p>{lesson.subtitle}</p>
      </header>

      <main className="layout">
        <VocabularySection lesson={lesson} />
        <ListeningSection
          lesson={lesson}
          title="2. First Listening"
          playOnce
        />
        <PracticeSection lesson={lesson} />
        <FinalListeningSection lesson={lesson} />
      </main>
    </div>
  );
}

export default App;
