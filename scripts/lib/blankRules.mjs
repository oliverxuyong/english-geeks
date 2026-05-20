/** Deterministic blank-out rules (beginner / intermediate / advanced). */

const FUNCTION_WORDS = new Set([
  "a", "an", "the", "to", "of", "in", "on", "at", "for", "and", "or", "but",
  "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that",
  "i", "you", "he", "she", "we", "they", "my", "your", "his", "her", "our", "their",
  "as", "by", "with", "from", "will", "would", "can", "could", "do", "does", "did",
]);

function isContentWord(word) {
  const w = word.toLowerCase().replace(/[^a-z']/g, "");
  return w.length > 0 && !FUNCTION_WORDS.has(w);
}

function spacedBlanks(count) {
  if (count <= 0) return "";
  return "_ ".repeat(count).trimEnd();
}

function blankToken(word, style) {
  const letters = word.replace(/[^a-zA-Z']/g, "");
  if (!letters.length) return word;

  if (style === "full") {
    return spacedBlanks(letters.length);
  }

  if (style === "stub") {
    const show = Math.max(1, Math.ceil(letters.length * 0.35));
    const visible = letters.slice(0, show);
    const hidden = letters.length - show;
    return visible + (hidden > 0 ? ` ${spacedBlanks(hidden)}` : "");
  }

  return word;
}

export function buildBlanks(words) {
  const n = words.length;
  const beginner = [...words];
  const intermediate = [...words];
  const advanced = [...words];

  const hideBeginnerCount = Math.max(1, Math.ceil(n * 0.25));
  const hideIntermediateCount = Math.max(2, Math.ceil(n * 0.45));
  const hideAdvancedCount = Math.max(3, Math.ceil(n * 0.7));

  for (let i = n - hideBeginnerCount; i < n; i++) {
    beginner[i] = blankToken(words[i], "full");
  }

  let hidden = 0;
  for (let i = 0; i < n && hidden < hideIntermediateCount; i++) {
    if (isContentWord(words[i]) || i >= n - 2) {
      intermediate[i] = blankToken(words[i], "full");
      hidden++;
    }
  }

  hidden = 0;
  for (let i = 0; i < n && hidden < hideAdvancedCount; i++) {
    if (isContentWord(words[i]) || !FUNCTION_WORDS.has(words[i].toLowerCase())) {
      advanced[i] = blankToken(words[i], hidden < hideAdvancedCount - 2 ? "stub" : "full");
      hidden++;
    }
  }

  return { beginner, intermediate, advanced };
}
