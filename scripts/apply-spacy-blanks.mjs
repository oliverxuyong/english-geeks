#!/usr/bin/env node
/**
 * Regenerate sentence blanks in an existing lesson using spaCy blank_out_designated_words.
 * Usage: node scripts/apply-spacy-blanks.mjs [lessonId]
 * Default lessonId: lesson001 → src/data/lesson001.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildBlanksWithSpacy } from "./lib/spacyBlankRules.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonId = process.argv[2] ?? "lesson001";
const lessonPath = path.join(root, "src/data", `${lessonId}.js`);

const mod = await import(lessonPath);
const lesson = mod[lessonId];

for (const s of lesson.sentences) {
  const tokens = s.words.map((w) => w.text);
  s.blanks = buildBlanksWithSpacy(tokens, s.english);
}

fs.writeFileSync(lessonPath, `export const ${lessonId} = ${JSON.stringify(lesson, null, 2)};\n`);
console.log("Updated blanks in", lessonPath);
