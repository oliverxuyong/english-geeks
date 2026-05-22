#!/usr/bin/env node
/**
 * Build lesson JSON + public audio assets.
 *
 * Path B: node scripts/build-lesson.mjs --text scripts/sample-passage.txt --id lesson001
 * Path A: node scripts/build-lesson.mjs --media recording.mp3 --id lesson002
 *
 * Env: OPENAI_API_KEY (Whisper + optional enrich), DEEPL_API_KEY (optional translate)
 * Requires ffmpeg on PATH for --media clip extraction.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import { splitSentences, tokenizeWords, padId, buildWordRecords } from "./lib/tokenize.mjs";
import { buildBlanksWithSpacy } from "./lib/spacyBlankRules.mjs";
import { emitLessonJs, ensurePublicDir, audioUrl } from "./lib/emitLesson.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    text: null,
    media: null,
    id: "lesson001",
    title: "English Geeks",
    subtitle: "英语极客",
    out: null,
    enrich: false,
    draft: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--text") opts.text = argv[++i];
    else if (arg === "--media") opts.media = argv[++i];
    else if (arg === "--id") opts.id = argv[++i];
    else if (arg === "--title") opts.title = argv[++i];
    else if (arg === "--subtitle") opts.subtitle = argv[++i];
    else if (arg === "--out") opts.out = argv[++i];
    else if (arg === "--enrich") opts.enrich = true;
    else if (arg === "--draft") opts.draft = true;
    else if (arg === "--help") {
      console.log(`Usage:
  Path B: node scripts/build-lesson.mjs --text passage.txt --id lesson001
  Path A: node scripts/build-lesson.mjs --media audio.mp3 --id lesson002 [--enrich]

Options: --title, --subtitle, --out, --enrich, --draft`);
      process.exit(0);
    }
  }

  return opts;
}

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function transcribeWhisper(mediaPath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY required for Whisper transcription (--media).");
  }

  const buffer = fs.readFileSync(mediaPath);
  const name = path.basename(mediaPath);
  const form = new FormData();
  form.append("file", new Blob([buffer]), name);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Whisper failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

function segmentsToSentences(segments) {
  return segments.map((seg) => ({
    english: seg.text.trim(),
    start: seg.start,
    end: seg.end,
  }));
}

function cutAudio(input, output, start, end) {
  spawnSync(
    "ffmpeg",
    ["-y", "-i", input, "-ss", String(start), "-to", String(end), "-c:a", "libmp3lame", "-q:a", "4", output],
    { stdio: "inherit" }
  );
}

function pickVocabulary(sentences, max = 8) {
  const freq = new Map();
  for (const s of sentences) {
    for (const w of s.words) {
      const key = w.text.toLowerCase().replace(/[^a-z']/g, "");
      if (key.length < 5) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
  let v = 1;
  return ranked.map(([word]) => ({
    id: `v${padId(v++)}`,
    word,
    ipa: "",
    chinese: "",
    english: "",
    meaningInContext: "",
    audioUrl: "",
  }));
}

async function enrichWithOpenAI(lesson) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return lesson;

  const payload = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You enrich an English lesson JSON. Return { vocabulary, sentences } with chinese, english gloss, ipa (slash notation), meaningInContext for vocab. Keep ids unchanged.",
      },
      {
        role: "user",
        content: JSON.stringify({
          vocabulary: lesson.vocabulary,
          sentences: lesson.sentences.map((s) => ({
            id: s.id,
            english: s.english,
            words: s.words.map((w) => ({ id: w.id, text: w.text })),
          })),
        }),
      },
    ],
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.warn("Enrich skipped:", await res.text());
    return lesson;
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  for (const vs of parsed.vocabulary ?? []) {
    const target = lesson.vocabulary.find((v) => v.id === vs.id || v.word === vs.word);
    if (target) Object.assign(target, vs);
  }

  for (const ss of parsed.sentences ?? []) {
    const target = lesson.sentences.find((s) => s.id === ss.id);
    if (!target) continue;
    if (ss.chinese) target.chinese = ss.chinese;
    for (const w of ss.words ?? []) {
      const tw = target.words.find((x) => x.id === w.id);
      if (tw) Object.assign(tw, w);
    }
  }

  return lesson;
}

function buildLessonFromSentences(sentenceTexts, opts, timings = null) {
  const publicDir = ensurePublicDir(opts.id, ROOT);
  const sentences = sentenceTexts.map((english, idx) => {
    const index = idx + 1;
    const tokens = tokenizeWords(english);
    const words = buildWordRecords(index, tokens);
    const blanks = buildBlanksWithSpacy(tokens, english);
    const sid = padId(index);

    return {
      id: `s${sid}`,
      index,
      english,
      chinese: "",
      audioUrl: audioUrl(opts.id, `s${sid}.mp3`),
      words,
      blanks,
    };
  });

  const lesson = {
    id: opts.id,
    title: opts.title,
    subtitle: opts.subtitle,
    fullAudioUrl: audioUrl(opts.id, "full.mp3"),
    fullVideoUrl: "",
    vocabulary: pickVocabulary(sentences),
    sentences,
  };

  if (timings) {
    for (let i = 0; i < sentences.length; i++) {
      if (timings[i]) {
        sentences[i]._start = timings[i].start;
        sentences[i]._end = timings[i].end;
      }
    }
  }

  return { lesson, publicDir };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.text && !opts.media) {
    console.error("Provide --text <file> or --media <file>.");
    process.exit(1);
  }

  if (opts.text && opts.media) {
    console.error("Use only one input: --text (Path B) or --media (Path A), not both.");
    process.exit(1);
  }

  let sentenceTexts = [];
  let timings = null;
  let mediaPath = null;

  if (opts.text) {
    const raw = fs.readFileSync(path.resolve(ROOT, opts.text), "utf8");
    sentenceTexts = splitSentences(raw);
    console.log(`Path B: ${sentenceTexts.length} sentences from text.`);
  } else if (opts.media) {
    mediaPath = path.resolve(ROOT, opts.media);
    if (!fs.existsSync(mediaPath)) {
      console.error("Media file not found:", mediaPath);
      process.exit(1);
    }

    console.log("Path A: transcribing with Whisper…");
    const transcript = await transcribeWhisper(mediaPath);
    const segments = transcript.segments ?? [];
    const mapped = segmentsToSentences(segments);
    sentenceTexts = mapped.map((m) => m.english);
    timings = mapped;
    console.log(`Path A: ${sentenceTexts.length} segments.`);
  }

  if (sentenceTexts.length < 10) {
    console.warn(`Warning: only ${sentenceTexts.length} sentences (target 10–20).`);
  }

  const { lesson, publicDir } = buildLessonFromSentences(sentenceTexts, opts, timings);

  if (mediaPath && hasFfmpeg()) {
    const fullOut = path.join(publicDir, "full.mp3");
    fs.copyFileSync(mediaPath, fullOut);
    console.log("Wrote", fullOut);

    for (const s of lesson.sentences) {
      if (s._start == null) continue;
      const out = path.join(publicDir, `${s.id}.mp3`);
      cutAudio(mediaPath, out, s._start, s._end);
      delete s._start;
      delete s._end;
    }
  } else if (mediaPath) {
    console.warn("ffmpeg not found; skipped per-sentence clips.");
  }

  if (opts.enrich) {
    console.log("Enriching with OpenAI…");
    await enrichWithOpenAI(lesson);
  }

  for (const v of lesson.vocabulary) {
    if (!v.audioUrl) v.audioUrl = audioUrl(opts.id, `${v.id}.mp3`);
  }

  const outJs = opts.out ?? path.join(ROOT, "src", "data", `${opts.id}.js`);
  const draftPath = path.join(ROOT, "src", "data", `${opts.id}.draft.json`);

  if (opts.draft) {
    fs.writeFileSync(draftPath, JSON.stringify(lesson, null, 2));
    console.log("Draft:", draftPath);
  }

  emitLessonJs(lesson, outJs);
  console.log("Lesson module:", outJs);
  console.log("Public assets:", publicDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
