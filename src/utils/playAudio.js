/** Play pre-generated MP3; fall back to speechSynthesis when URL missing or load fails. */

export function speakWord(text, audioUrl) {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => speakWithSynthesis(text));
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

  const audio = new Audio(url);
  audio.addEventListener("ended", () => onEnded?.());
  audio.addEventListener("error", () => onError?.(new Error("Playback failed")));
  audio.play().catch((err) => onError?.(err));
  return audio;
}
