/** Play pre-generated audio; fall back to speechSynthesis when URL missing or load fails. */

const stopListeners = new Set();
let activeAudio = null;
let voicesPrimed = false;
let stopSpeechRecognition = null;

/** Practice STT registers stopSpeaking; playback calls this to end listening cleanly. */
export function setSpeechRecognitionStop(fn) {
  stopSpeechRecognition = fn;
}

function stopSttBeforePlayback() {
  stopSpeechRecognition?.();
}

export function subscribePlaybackStop(listener) {
  stopListeners.add(listener);
  return () => stopListeners.delete(listener);
}

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function stopAllPlayback() {
  stopActiveAudio();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  for (const listener of stopListeners) listener();
}

function trackAudio(audio) {
  activeAudio = audio;
  const release = () => {
    if (activeAudio === audio) activeAudio = null;
  };
  audio.addEventListener("ended", release);
  audio.addEventListener("error", release);
}

export function releaseAudio(audio) {
  if (audio && activeAudio === audio) activeAudio = null;
}

export function primeSpeechVoices() {
  if (voicesPrimed || typeof window === "undefined" || !window.speechSynthesis) return;
  voicesPrimed = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener(
    "voiceschanged",
    () => window.speechSynthesis.getVoices(),
    { once: true }
  );
}

function speakWithSynthesis(text) {
  stopSttBeforePlayback();
  if (!window.speechSynthesis) return;
  primeSpeechVoices();

  const synth = window.speechSynthesis;
  const run = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    if (synth.paused) synth.resume();
    synth.speak(utterance);
  };

  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(run, 50);
    return;
  }
  run();
}

export function speakWord(text, audioUrl) {
  stopSttBeforePlayback();
  stopActiveAudio();
  for (const listener of stopListeners) listener();

  if (!audioUrl) {
    speakWithSynthesis(text);
    return;
  }

  const audio = new Audio(audioUrl);
  let clipOk = false;

  const cancelFallback = () => {
    clipOk = true;
    clearTimeout(failTimer);
  };

  const fallback = () => {
    if (clipOk) return;
    clipOk = true;
    clearTimeout(failTimer);
    audio.pause();
    releaseAudio(audio);
    speakWithSynthesis(text);
  };

  trackAudio(audio);
  audio.addEventListener("ended", cancelFallback, { once: true });
  audio.addEventListener("error", fallback, { once: true });
  audio.addEventListener("playing", cancelFallback, { once: true });
  const failTimer = setTimeout(fallback, 800);

  audio.play().catch(fallback);
}

export function playMediaUrl(url, { onEnded, onError } = {}) {
  if (!url) {
    onError?.(new Error("No media URL"));
    return null;
  }

  stopSttBeforePlayback();
  stopAllPlayback();

  const audio = new Audio(url);
  trackAudio(audio);
  audio.addEventListener("ended", () => onEnded?.());
  audio.addEventListener("error", () => onError?.(new Error("Playback failed")));
  audio.play().catch((err) => onError?.(err));
  return audio;
}
