#!/usr/bin/env node
/**
 * Fill per-word ipa, chinese, english in lesson001.js via OpenAI.
 * Usage: OPENAI_API_KEY=sk-... node scripts/enrich-word-glosses.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lessonPath = path.join(root, "src/data/lesson001.js");
const BATCH_SIZE = 3;

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
          content: `You add learner glosses for each token in an English lesson about Italian food culture.
Return JSON: { "sentences": [ { "id": "s001", "words": [ { "id": "s001-w001", "ipa": "/aɪ/", "chinese": "我", "english": "short gloss" } ] } ] }
Rules:
- Keep every word id and text unchanged; only add ipa, chinese, english.
- IPA in slash notation. Chinese: brief gloss for learners. English: one short definition.
- Function words get simple glosses. "senseful" means sensible/reasonable in context.
- "I'd", "There's", "aren't", "they've", "it's" as contractions.`,
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
  const mod = await import(lessonPath);
  const lesson = mod.lesson001;
  const context =
    "Talk about Italian food rules, pineapple on pizza, cappuccino as breakfast only, digestion.";

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

  const out = `export const lesson001 = ${JSON.stringify(lesson, null, 2)};\n`;
  fs.writeFileSync(lessonPath, out);
  console.log("Wrote", lessonPath);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
