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

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/** Whether a spoken token likely refers to the same lesson token (STT typo). */
export function tokensFuzzyMatch(referenceToken, spokenToken) {
  if (referenceToken === spokenToken) return true;

  const refLen = referenceToken.length;
  const spokenLen = spokenToken.length;
  if (refLen < 3 || spokenLen < 3) return false;

  if (levenshtein(referenceToken, spokenToken) <= 1) return true;

  const shorter = refLen <= spokenLen ? referenceToken : spokenToken;
  const longer = refLen <= spokenLen ? spokenToken : referenceToken;
  if (shorter.length >= 4 && longer.startsWith(shorter)) return true;

  return false;
}

/**
 * Map STT tokens onto lesson vocabulary where alignment supports a near match.
 * Does not insert tokens the user did not speak.
 */
export function alignTranscriptToReference(originalWords, spokenText) {
  const entries = buildMatchSequence(originalWords);
  const reference = entries.map((e) => e.token);
  const spoken = textToWords(spokenText);

  if (!spoken.length || !reference.length) {
    return spokenText;
  }

  const m = reference.length;
  const n = spoken.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensFuzzyMatch(reference[i - 1], spoken[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const corrected = [...spoken];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (tokensFuzzyMatch(reference[i - 1], spoken[j - 1])) {
      if (reference[i - 1] !== spoken[j - 1]) {
        corrected[j - 1] = reference[i - 1];
      }
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return corrected.join(" ");
}

export function findMatchedWordIndexes(originalWords, spokenText) {
  const alignedText = alignTranscriptToReference(originalWords, spokenText);
  const entries = buildMatchSequence(originalWords);
  const original = entries.map((e) => e.token);
  const spoken = textToWords(alignedText);

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
