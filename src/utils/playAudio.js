/** Play pre-generated MP3; fall back to speechSynthesis when URL missing or load fails. */

const stopListeners = new Set();
let activeAudio = null;

export function subscribePlaybackStop(listener) {
  stopListeners.add(listener);
  return () => stopListeners.delete(listener);
}

export function stopAllPlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
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

export function speakWord(text, audioUrl) {
  stopAllPlayback();
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    trackAudio(audio);
    audio.play().catch(() => {
      if (activeAudio === audio) activeAudio = null;
      speakWithSynthesis(text);
    });
    return;
  }
  speakWithSynthesis(text);
}

function speakWithSynthesis(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

export function playMediaUrl(url, { onEnded, onError } = {}) {
  if (!url) {
    onError?.(new Error("No media URL"));
    return null;
  }

  stopAllPlayback();

  const audio = new Audio(url);
  trackAudio(audio);
  audio.addEventListener("ended", () => onEnded?.());
  audio.addEventListener("error", () => onError?.(new Error("Playback failed")));
  audio.play().catch((err) => onError?.(err));
  return audio;
}
