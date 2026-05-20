#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WORD_GLOSSES } from "./lesson001-word-glosses.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonPath = path.join(root, "src/data/lesson001.js");

const mod = await import(lessonPath);
const lesson = mod.lesson001;
let filled = 0;
let missing = 0;

for (const s of lesson.sentences) {
  for (const w of s.words) {
    const g = WORD_GLOSSES[w.id];
    if (g) {
      w.ipa = g.ipa;
      w.chinese = g.chinese;
      w.english = g.english;
      filled++;
    } else {
      missing++;
      console.warn("Missing gloss:", w.id, w.text);
    }
  }
}

fs.writeFileSync(lessonPath, `export const lesson001 = ${JSON.stringify(lesson, null, 2)};\n`);
console.log(`Filled ${filled} words; missing ${missing}.`);
