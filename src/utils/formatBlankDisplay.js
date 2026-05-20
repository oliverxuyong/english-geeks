const LETTER_TEST = /['a-zA-Z]/;
const LETTER_MATCH = /['a-zA-Z]/g;

/** Shown in a blank letter slot (monospace, same width as letters). */
export const BLANK_PLACEHOLDER = "_";

/**
 * How many leading letter/apostrophe chars are visible in the stored blank string.
 */
export function countVisibleLetters(wordText, blankText) {
  const letterCount = (wordText.match(LETTER_MATCH) || []).length;
  if (!blankText || blankText === wordText || letterCount === 0) {
    return letterCount;
  }

  const compact = blankText.replace(/ /g, "");
  if (/^_+$/.test(compact)) return 0;

  const stub = blankText.match(/^(.+?)(_+)$/);
  if (stub && !stub[1].includes("_")) {
    return (stub[1].match(LETTER_MATCH) || []).length;
  }

  if (blankText.includes("_ ")) {
    const prefix = blankText.split(/\s+_/)[0];
    return (prefix.match(LETTER_MATCH) || []).length;
  }

  return letterCount;
}

/**
 * Per-character slots for in-place reveal (Full Text / matched).
 * @returns {{ char: string, hidden: boolean }[]}
 */
export function buildWordCharSlots(wordText, blankText) {
  const visibleCount = countVisibleLetters(wordText, blankText);
  const slots = [];
  let letterIdx = 0;

  for (const char of wordText) {
    if (LETTER_TEST.test(char)) {
      slots.push({ char, hidden: letterIdx >= visibleCount });
      letterIdx++;
    } else {
      slots.push({ char, hidden: false });
    }
  }

  return slots;
}
