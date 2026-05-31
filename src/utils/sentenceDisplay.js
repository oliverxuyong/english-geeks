/**
 * Build practice-line display groups from sentence.english + sentence.words.
 * Punctuation from the English sentence is shown but not treated as a word
 * (no blanks, popup, or speech-match index).
 */

function tokenizeEnglish(sentence) {
  return sentence.english.match(/[\w']+|[^\s\w]/g) ?? [];
}

function isWordToken(token) {
  return /[\w']/.test(token);
}

/**
 * @returns {Array<
 *   | { type: "word"; word: object; wordIndex: number; leadingPunct: string[]; trailingPunct: string[]; tightLeft?: boolean }
 *   | { type: "punct-only"; text: string }
 * >}
 */
export function buildSentenceDisplayGroups(sentence) {
  const tokens = tokenizeEnglish(sentence);
  const groups = [];
  let wordIndex = 0;
  let pendingLeading = [];

  for (const token of tokens) {
    if (isWordToken(token)) {
      const word = sentence.words[wordIndex];
      if (!word) break;

      groups.push({
        type: "word",
        word,
        wordIndex,
        leadingPunct: pendingLeading,
        trailingPunct: [],
      });
      pendingLeading = [];
      wordIndex += 1;
      continue;
    }

    if (groups.length === 0) {
      pendingLeading.push(token);
      continue;
    }

    groups[groups.length - 1].trailingPunct.push(token);
  }

  if (pendingLeading.length) {
    groups.unshift({ type: "punct-only", text: pendingLeading.join("") });
  }

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const prev = groups[i - 1];
    if (
      group.type === "word" &&
      prev?.type === "word" &&
      prev.trailingPunct.at(-1) === "-"
    ) {
      group.tightLeft = true;
    }
  }

  return groups;
}
