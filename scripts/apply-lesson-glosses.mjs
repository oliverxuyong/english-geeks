#!/usr/bin/env node
/**
 * Fill per-word ipa/chinese/english using lesson001 glosses (by token text)
 * plus lesson-specific supplements.
 * Usage: node scripts/apply-lesson-glosses.mjs lesson002
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORD_GLOSSES as LESSON001_BY_ID } from "./lesson001-word-glosses.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonId = process.argv[2];
if (!lessonId) {
  console.error("Usage: node scripts/apply-lesson-glosses.mjs <lessonId>");
  process.exit(1);
}

const lessonPath = path.join(root, "src/data", `${lessonId}.js`);
const supplementPath = path.join(root, "scripts", `${lessonId}-extra-glosses.json`);

const mod001 = await import(path.join(root, "src/data/lesson001.js"));
const lesson001 = mod001.lesson001;

const byText = new Map();
for (const s of lesson001.sentences) {
  for (const w of s.words) {
    if (w.ipa) byText.set(w.text.toLowerCase(), { ipa: w.ipa, chinese: w.chinese, english: w.english });
  }
}
for (const g of Object.values(LESSON001_BY_ID)) {
  // ids only; skip
}

if (fs.existsSync(supplementPath)) {
  const extra = JSON.parse(fs.readFileSync(supplementPath, "utf8"));
  for (const [key, g] of Object.entries(extra)) {
    byText.set(key.toLowerCase(), g);
  }
}

const mod = await import(lessonPath);
const lesson = mod[lessonId];
let filled = 0;
let missing = 0;
const missingWords = new Set();

for (const s of lesson.sentences) {
  for (const w of s.words) {
    const g = byText.get(w.text.toLowerCase());
    if (g?.ipa) {
      w.ipa = g.ipa;
      w.chinese = g.chinese ?? "";
      w.english = g.english ?? "";
      filled++;
    } else {
      missing++;
      missingWords.add(w.text);
    }
  }
}

fs.writeFileSync(lessonPath, `export const ${lessonId} = ${JSON.stringify(lesson, null, 2)};\n`);
console.log(`Filled ${filled} words; missing ${missing}.`);
if (missingWords.size) {
  console.warn("Missing tokens:", [...missingWords].sort().join(", "));
}
