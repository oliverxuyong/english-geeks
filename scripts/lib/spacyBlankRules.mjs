/**
 * spaCy blanking via blank_out_designated_words.py
 * Level 2 → beginner, 4 → intermediate, 5 → advanced
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokenizeWords } from "./tokenize.mjs";
import { buildBlanks } from "./blankRules.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** spaCy blank_level → lesson blanks key */
export const SPACY_LEVEL_MAP = {
  beginner: "2",
  intermediate: "4",
  advanced: "5",
};

const PYTHON = process.env.PYTHON ?? "python3";
const CLI = path.join(__dirname, "blank_spacy_cli.py");

let spacyAvailable = null;

export function isSpacyBlankingAvailable() {
  if (spacyAvailable !== null) return spacyAvailable;
  const probe = spawnSync(
    PYTHON,
    ["-c", "import spacy; spacy.load('en_core_web_sm')"],
    { encoding: "utf8", timeout: 120_000 },
  );
  spacyAvailable = probe.status === 0;
  if (!spacyAvailable) {
    console.warn(
      "[spacy] spaCy blanking unavailable — using scripts/lib/blankRules.mjs fallback.",
      probe.stderr?.trim() || "(install: pip install -r requirements-spacy.txt && python -m spacy download en_core_web_sm)",
    );
  }
  return spacyAvailable;
}

function blankSentenceForLevel(sentence, level) {
  const res = spawnSync(PYTHON, [CLI], {
    input: JSON.stringify({ sentence, level: String(level) }),
    encoding: "utf8",
    timeout: 60_000,
    cwd: __dirname,
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || `blank_spacy_cli exited ${res.status}`);
  }
  return res.stdout;
}

/**
 * Split a spaCy-blanked sentence into per-token strings aligned with tokenizeWords().
 */
export function alignBlanksToTokens(originalTokens, blankedSentence) {
  const blankedTokens = tokenizeWords(blankedSentence);
  if (blankedTokens.length === originalTokens.length) {
    return blankedTokens;
  }

  const aligned = [];
  let cursor = 0;
  for (const word of originalTokens) {
    const slice = blankedSentence.slice(cursor);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(${escaped}|[^\\s]+)`);
    const m = slice.match(re);
    if (!m) {
      return null;
    }
    aligned.push(m[1]);
    cursor += m[0].length;
    const ws = blankedSentence.slice(cursor).match(/^\s+/);
    if (ws) cursor += ws[0].length;
  }
  return aligned.length === originalTokens.length ? aligned : null;
}

function blankOneLevel(tokens, sentence, spacyLevel) {
  const blanked = blankSentenceForLevel(sentence, spacyLevel);
  const aligned = alignBlanksToTokens(tokens, blanked);
  if (!aligned) {
    console.warn(
      `[spacy] Token count mismatch for level ${spacyLevel} (${tokens.length} vs ${tokenizeWords(blanked).length}); fallback blankRules for this sentence.`,
    );
    return null;
  }
  return aligned;
}

/**
 * @param {string[]} tokens — lesson word texts
 * @param {string} sentence — full English sentence
 * @returns {{ beginner: string[], intermediate: string[], advanced: string[] }}
 */
export function buildBlanksWithSpacy(tokens, sentence) {
  const fallback = buildBlanks(tokens);
  if (!isSpacyBlankingAvailable()) {
    return fallback;
  }

  const out = { ...fallback };
  for (const [key, spacyLevel] of Object.entries(SPACY_LEVEL_MAP)) {
    try {
      const aligned = blankOneLevel(tokens, sentence, spacyLevel);
      if (aligned) out[key] = aligned;
    } catch (err) {
      console.warn(`[spacy] level ${spacyLevel} (${key}):`, err.message);
    }
  }
  return out;
}
