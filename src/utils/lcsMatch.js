/**
 * Contraction → expanded form for STT alignment.
 * Lesson tokens (e.g. "aren't") and spoken text must use the same expansion before LCS.
 */
const CONTRACTION_EXPANSIONS = {
  "i'm": "i am",
  "i'd": "i would",
  "i've": "i have",
  "i'll": "i will",
  "you're": "you are",
  "you've": "you have",
  "you'll": "you will",
  "he's": "he is",
  "he'd": "he would",
  "he'll": "he will",
  "she's": "she is",
  "she'd": "she would",
  "she'll": "she will",
  "it's": "it is",
  "it'd": "it would",
  "it'll": "it will",
  "we're": "we are",
  "we've": "we have",
  "we'll": "we will",
  "they're": "they are",
  "they've": "they have",
  "they'll": "they will",
  "that's": "that is",
  "there's": "there is",
  "here's": "here is",
  "what's": "what is",
  "who's": "who is",
  "where's": "where is",
  "when's": "when is",
  "why's": "why is",
  "how's": "how is",
  "let's": "let us",
  "can't": "can not",
  "won't": "will not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "couldn't": "could not",
  "wouldn't": "would not",
  "shouldn't": "should not",
  "mustn't": "must not",
};

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeApostrophe(word) {
  return word.toLowerCase().trim().replace(/[''`]/g, "'");
}

function stripPunctuation(word) {
  return word.replace(/[.,!?;:"'()[\]{}]/g, "").trim();
}

function expandContractionsInText(text) {
  let t = text.toLowerCase();
  for (const [contraction, expanded] of Object.entries(CONTRACTION_EXPANSIONS)) {
    t = t.replace(new RegExp(`\\b${escapeRegExp(contraction)}\\b`, "g"), expanded);
  }
  return t;
}

/** Tokens used for LCS from a single lesson word (splits contractions). */
export function wordToMatchTokens(text) {
  const key = normalizeApostrophe(text);
  const expanded = CONTRACTION_EXPANSIONS[key];
  if (expanded) {
    return expanded
      .split(/\s+/)
      .map(stripPunctuation)
      .filter(Boolean);
  }
  const single = stripPunctuation(key);
  return single ? [single] : [];
}

export function normalizeWord(word) {
  return stripPunctuation(normalizeApostrophe(word));
}

export function normalizeSpokenText(text) {
  return expandContractionsInText(text)
    .replace(/\bweb page\b/g, "webpage")
    .replace(/[.,!?;:"'()[\]{}]/g, "")
    .trim();
}

export function textToWords(text) {
  return normalizeSpokenText(text)
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter(Boolean);
}

function buildMatchSequence(originalWords) {
  const entries = [];
  originalWords.forEach((word, wordIndex) => {
    for (const token of wordToMatchTokens(word.text)) {
      entries.push({ wordIndex, token });
    }
  });
  return entries;
}

export function findMatchedWordIndexes(originalWords, spokenText) {
  const entries = buildMatchSequence(originalWords);
  const original = entries.map((e) => e.token);
  const spoken = textToWords(spokenText);

  const m = original.length;
  const n = spoken.length;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (original[i - 1] === spoken[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const matchedIndexes = new Set();

  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (original[i - 1] === spoken[j - 1]) {
      matchedIndexes.add(entries[i - 1].wordIndex);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return matchedIndexes;
}

export function calculateMatchScore(originalWords, matchedWordIndexes) {
  if (!originalWords.length) {
    return 0;
  }

  return Math.round((matchedWordIndexes.size / originalWords.length) * 100);
}
