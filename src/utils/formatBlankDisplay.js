/** One visible slot per hidden letter, separated by spaces (e.g. "_ _ _"). */

function spacedBlanks(count) {
  if (count <= 0) return "";
  return "_ ".repeat(count).trimEnd();
}

/**
 * @param {string} wordText - original token text
 * @param {string} blankText - stored blank from lesson data
 */
export function formatBlankDisplay(wordText, blankText) {
  if (!blankText || blankText === wordText) return blankText;

  const letters = wordText.replace(/[^a-zA-Z']/g, "");
  if (!letters.length) return blankText;

  if (blankText.includes("_ ")) {
    return blankText;
  }

  if (/^_+$/.test(blankText)) {
    return spacedBlanks(letters.length);
  }

  const stub = blankText.match(/^(.+?)(_+)$/);
  if (stub && !stub[1].includes("_")) {
    const visibleLetters = stub[1].replace(/[^a-zA-Z']/g, "").length;
    const hidden = Math.max(0, letters.length - visibleLetters);
    return stub[1] + (hidden > 0 ? ` ${spacedBlanks(hidden)}` : "");
  }

  return blankText;
}
