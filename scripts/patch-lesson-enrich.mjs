#!/usr/bin/env node
/** Merge scripts/{lessonId}-enrich.json into src/data/{lessonId}.js */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonId = process.argv[2] ?? "lesson001";
const lessonPath = path.join(root, "src/data", `${lessonId}.js`);
const enrichPath = path.join(root, "scripts", `${lessonId}-enrich.json`);

if (!fs.existsSync(enrichPath)) {
  console.error(`Missing ${enrichPath}`);
  process.exit(1);
}

const enrich = JSON.parse(fs.readFileSync(enrichPath, "utf8"));
const mod = await import(lessonPath);
const lesson = mod[lessonId];

if (enrich.vocabulary) {
  lesson.vocabulary = enrich.vocabulary;
}

for (const s of lesson.sentences) {
  if (enrich.sentences?.[s.id]) s.chinese = enrich.sentences[s.id];
}

const out = `export const ${lessonId} = ${JSON.stringify(lesson, null, 2)};\n`;
fs.writeFileSync(lessonPath, out);
console.log("Patched", lessonPath);
console.log("Tip: run node scripts/enrich-word-glosses.mjs", lessonId);
