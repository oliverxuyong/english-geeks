#!/usr/bin/env node
/** Merge scripts/lesson001-enrich.json into src/data/lesson001.js */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonPath = path.join(root, "src/data/lesson001.js");
const enrichPath = path.join(root, "scripts/lesson001-enrich.json");

const enrich = JSON.parse(fs.readFileSync(enrichPath, "utf8"));
const mod = await import(lessonPath);
const lesson = mod.lesson001;

for (const v of enrich.vocabulary) {
  const target = lesson.vocabulary.find((x) => x.id === v.id);
  if (target) Object.assign(target, v);
}

lesson.vocabulary = enrich.vocabulary;

for (const s of lesson.sentences) {
  if (enrich.sentences[s.id]) s.chinese = enrich.sentences[s.id];
}

const out = `export const lesson001 = ${JSON.stringify(lesson, null, 2)};\n`;
fs.writeFileSync(lessonPath, out);
console.log("Patched", lessonPath);
console.log("Tip: run node scripts/apply-word-glosses.mjs to restore per-word glosses.");
