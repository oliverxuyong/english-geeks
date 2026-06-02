const MAX_PHRASES = 100;
const SENTENCE_BOOST = 2.0;
const HARD_WORD_BOOST = 4;
const MEDIUM_WORD_BOOST = 3;

function wordPhraseBoost(text) {
  if (/[-']/.test(text)) return HARD_WORD_BOOST;
  if (text.length >= 8) return HARD_WORD_BOOST;
  if (text.length >= 6) return MEDIUM_WORD_BOOST;
  if (/[A-Z]/.test(text.slice(1))) return HARD_WORD_BOOST;
  return 0;
}

/**
 * Phrase hints for experimental SpeechRecognition.phrases contextual biasing.
 */
export function buildPhraseList(referenceText, words = []) {
  const phrases = [];
  const seen = new Set();

  const sentence = referenceText?.trim();
  if (sentence) {
    phrases.push({ phrase: sentence, boost: SENTENCE_BOOST });
    seen.add(sentence.toLowerCase());
  }

  for (const word of words) {
    const text = word.text?.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    const boost = wordPhraseBoost(text);
    if (boost > 0) {
      phrases.push({ phrase: text, boost });
      seen.add(key);
    }
  }

  return phrases.slice(0, MAX_PHRASES);
}

function speechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * Whether contextual biasing is safe to enable.
 * macOS desktop Chrome exposes phrases + processLocally but local models are
 * often unavailable, which silences recognition entirely. Cloud STT still works
 * when we skip phrases (Safari uses that path; alignTranscript still helps).
 */
export function canUseSpeechPhrases() {
  const Ctor = speechRecognitionCtor();
  const PhraseCtor = window.SpeechRecognitionPhrase;
  if (!Ctor || !PhraseCtor) return false;

  let probe;
  try {
    probe = new Ctor();
  } catch {
    return false;
  }
  if (!("phrases" in probe)) return false;

  const ua = navigator.userAgent;
  const isMacDesktop =
    /Macintosh|Mac OS X/i.test(ua) &&
    !/iPhone|iPad|iPod|Android|Mobile/i.test(ua);
  if (isMacDesktop) return false;

  return true;
}

/**
 * Apply contextual biasing when the browser supports SpeechRecognitionPhrase.
 * @returns {boolean} whether phrases were applied
 */
export function applySpeechPhrases(recognition, referenceText, words) {
  if (!canUseSpeechPhrases()) return false;

  const PhraseCtor = window.SpeechRecognitionPhrase;
  if (!PhraseCtor || !("phrases" in recognition)) return false;

  const phraseList = buildPhraseList(referenceText, words);
  if (!phraseList.length) return false;

  recognition.phrases = phraseList.map(
    (entry) => new PhraseCtor(entry.phrase, entry.boost),
  );

  // Do not set processLocally: true — it forces on-device recognition and breaks
  // macOS desktop Chrome when no local model is installed.

  return true;
}
