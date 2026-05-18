export function normalizeWord(word) {
    return word
      .toLowerCase()
      .replace(/[.,!?;:"'()[\]{}]/g, "")
      .trim();
  }
  
  export function normalizeSpokenText(text) {
    return text
      .toLowerCase()
      .replace(/\bi'm\b/g, "i am")
      .replace(/\bcan't\b/g, "can not")
      .replace(/\bwon't\b/g, "will not")
      .replace(/\bdon't\b/g, "do not")
      .replace(/\bdoesn't\b/g, "does not")
      .replace(/\bdidn't\b/g, "did not")
      .replace(/\bisn't\b/g, "is not")
      .replace(/\baren't\b/g, "are not")
      .replace(/\bwasn't\b/g, "was not")
      .replace(/\bweren't\b/g, "were not")
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
  
  export function findMatchedWordIndexes(originalWords, spokenText) {
    const original = originalWords.map((word) => normalizeWord(word.text));
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
        matchedIndexes.add(i - 1);
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