/** Split raw text into sentences (10–20 target) and tokenize words. */

const MAX_SENTENCE_CHARS = 140;
const MIN_SENTENCES = 10;
const MAX_SENTENCES = 20;

export function splitSentences(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const rough = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const merged = [];
  for (const part of rough) {
    if (merged.length && part.length < 40 && merged[merged.length - 1].length + part.length < MAX_SENTENCE_CHARS) {
      merged[merged.length - 1] += " " + part;
    } else {
      merged.push(part);
    }
  }

  if (merged.length > MAX_SENTENCES) {
    return merged.slice(0, MAX_SENTENCES);
  }

  return merged;
}

export function tokenizeWords(sentence) {
  const tokens = sentence.match(/[\w']+|[^\s\w]/g) ?? [];
  return tokens.filter((t) => /\w/.test(t));
}

export function padId(num, width = 3) {
  return String(num).padStart(width, "0");
}

export function buildWordRecords(sentenceIndex, tokens) {
  const sid = padId(sentenceIndex);
  return tokens.map((text, i) => ({
    id: `s${sid}-w${padId(i + 1)}`,
    text,
    ipa: "",
    chinese: "",
    english: "",
  }));
}
