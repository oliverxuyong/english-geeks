#!/usr/bin/env node
/**
 * Fill per-word ipa, chinese, english in src/data/{lessonId}.js via OpenAI.
 * Usage: OPENAI_API_KEY=sk-... node scripts/enrich-word-glosses.mjs [lessonId]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonId = process.argv[2] ?? "lesson001";
const lessonPath = path.join(root, "src/data", `${lessonId}.js`);
const BATCH_SIZE = 3;

const LESSON_CONTEXT = {
  lesson001:
    "Talk about Italian food rules, pineapple on pizza, cappuccino as breakfast only, digestion.",
  lesson002:
    "Interview at an air show with an F-22 demonstration team commander: military service, aerobatics, G-forces, civilians, Memorial Day weekend, enlistment, honoring fallen service members.",
};

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

loadDotEnv();

async function enrichBatch(sentences, passageContext) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is required.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You add learner glosses for each token in an English lesson passage.
Return JSON: { "sentences": [ { "id": "s001", "words": [ { "id": "s001-w001", "ipa": "/aɪ/", "chinese": "我", "english": "short gloss" } ] } ] }
Rules:
- Keep every word id and text unchanged; only add ipa, chinese, english.
- IPA in slash notation. Chinese: brief gloss for learners. English: one short definition.
- Function words get simple glosses. Contractions: "I'd", "you're", "we're", "they've", "it's", etc.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            context: passageContext,
            sentences: sentences.map((s) => ({
              id: s.id,
              english: s.english,
              chinese: s.chinese,
              words: s.words.map((w) => ({ id: w.id, text: w.text })),
            })),
          }),
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function main() {
  if (!fs.existsSync(lessonPath)) {
    console.error(`Missing ${lessonPath}`);
    process.exit(1);
  }

  const mod = await import(lessonPath);
  const lesson = mod[lessonId];
  const context = LESSON_CONTEXT[lessonId] ?? lesson.subtitle ?? lesson.title;

  for (let i = 0; i < lesson.sentences.length; i += BATCH_SIZE) {
    const batch = lesson.sentences.slice(i, i + BATCH_SIZE);
    console.log(`Enriching ${batch[0].id} … ${batch[batch.length - 1].id}`);
    const parsed = await enrichBatch(batch, context);

    for (const ss of parsed.sentences ?? []) {
      const target = lesson.sentences.find((s) => s.id === ss.id);
      if (!target) continue;
      for (const w of ss.words ?? []) {
        const tw = target.words.find((x) => x.id === w.id);
        if (tw && w.ipa) {
          tw.ipa = w.ipa;
          tw.chinese = w.chinese ?? "";
          tw.english = w.english ?? "";
        }
      }
    }
  }

  const out = `export const ${lessonId} = ${JSON.stringify(lesson, null, 2)};\n`;
  fs.writeFileSync(lessonPath, out);
  console.log("Wrote", lessonPath);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
