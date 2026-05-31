#!/usr/bin/env node
/**
 * Rebuild lesson002 from scripts/lesson002-captions.txt + align audio via Whisper word timestamps.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { tokenizeWords, padId, buildWordRecords } from "./lib/tokenize.mjs";
import { buildBlanksWithSpacy } from "./lib/spacyBlankRules.mjs";
import { emitLessonJs, ensurePublicDir, audioUrl } from "./lib/emitLesson.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FFMPEG = (() => {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    return ffmpegStatic ?? "ffmpeg";
  }
})();

const LESSON_ID = "lesson002";
const MEDIA = path.join(ROOT, "scripts", "lesson002.mp4");
const CAPTIONS = path.join(ROOT, "scripts", "lesson002-captions.txt");

function loadCaptions() {
  return fs
    .readFileSync(CAPTIONS, "utf8")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 10 caption sentences → Whisper segment ids (from full.json). */
const CAPTION_SEGMENT_GROUPS = [
  [0],
  [1, 2],
  [3],
  [4],
  [5, 6, 7],
  [8, 9],
  [10],
  [11],
  [12],
  [13, 14],
];

const PAD_START = 0.05;
const PAD_END = 0.12;

function loadWhisperSegments(audioPath) {
  const outDir = path.join(ROOT, "scripts", ".whisper-out");
  const base = path.basename(audioPath, path.extname(audioPath));
  const cached = path.join(outDir, `${base}.json`);
  if (fs.existsSync(cached)) {
    console.log("Using cached Whisper JSON:", cached);
    return JSON.parse(fs.readFileSync(cached, "utf8")).segments ?? [];
  }

  const python = process.env.PYTHON ?? "python3";
  fs.mkdirSync(outDir, { recursive: true });
  const ffmpegDir = path.dirname(FFMPEG);
  const env = { ...process.env, PATH: `${ffmpegDir}${path.delimiter}${process.env.PATH ?? ""}` };

  console.log("Transcribing for segment alignment (local Whisper)…");
  const result = spawnSync(
    python,
    [
      "-m",
      "whisper",
      audioPath,
      "--model",
      process.env.WHISPER_MODEL ?? "base",
      "--language",
      "en",
      "--output_format",
      "json",
      "--output_dir",
      outDir,
    ],
    { stdio: "inherit", encoding: "utf8", env },
  );

  if (result.status !== 0) {
    throw new Error("Whisper failed. Set PYTHON to .venv-spacy with openai-whisper installed.");
  }

  return JSON.parse(fs.readFileSync(cached, "utf8")).segments ?? [];
}

function alignFromWhisperSegments(captionLines, segments) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const timings = [];

  for (let si = 0; si < captionLines.length; si++) {
    const ids = CAPTION_SEGMENT_GROUPS[si] ?? [];
    const segs = ids.map((id) => byId.get(id)).filter(Boolean);
    if (!segs.length) {
      timings.push({ start: 0, end: 0 });
      console.warn(`s${padId(si + 1)}: no segments matched`);
      continue;
    }
    const start = Math.max(0, segs[0].start - PAD_START);
    const end = segs[segs.length - 1].end + PAD_END;
    timings.push({ start, end });
    console.log(`s${padId(si + 1)}: ${start.toFixed(2)}–${end.toFixed(2)}s (segments ${ids.join(",")})`);
  }

  return timings;
}

function pickVocabulary(sentences, max = 5) {
  const VOCAB_STOP = new Set([
    "about", "after", "again", "being", "could", "every", "everyone", "first",
    "going", "great", "having", "honest", "honestly", "really", "right", "should",
    "something", "still", "thank", "thanks", "their", "there", "these", "think",
    "those", "through", "today", "together", "truth", "truthfully", "understand",
    "under", "until", "watching", "we're", "what", "when", "where", "which",
    "while", "with", "without", "would", "you're", "your", "able", "actually",
    "because", "before", "doing", "going", "pretty", "quite", "some", "such",
    "that", "this", "they", "them", "then", "than", "have", "been", "were", "here",
    "just", "like", "last", "life", "make", "many", "more", "most", "much",
    "only", "other", "over", "same", "someone", "take", "takes", "team", "tell",
    "time", "times", "very", "want", "weekend", "women", "fantastic", "absolutely",
    "uh", "um", "now", "so", "and", "the", "for", "are", "was", "were", "been",
  ]);

  const normalizeVocabKey = (text) => text.toLowerCase().replace(/[^a-z']/g, "");

  function vocabularyDifficulty(key) {
    if (key.length < 5 || VOCAB_STOP.has(key)) return -1;
    let score = key.length;
    if (key.length >= 9) score += 4;
    else if (key.length >= 7) score += 2;
    if (/(tion|ment|ance|ence|ship|ious|able|ical|ative)$/.test(key)) score += 3;
    return score;
  }

  const freq = new Map();
  for (const s of sentences) {
    for (const w of s.words) {
      const key = normalizeVocabKey(w.text);
      const d = vocabularyDifficulty(key);
      if (d < 0) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...freq.entries()]
    .map(([word, count]) => ({ word, score: vocabularyDifficulty(word) / Math.sqrt(count) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  let v = 1;
  return ranked.map(({ word }) => ({
    id: `v${padId(v++)}`,
    word,
    ipa: "",
    chinese: "",
    english: "",
    meaningInContext: "",
    audioUrl: "",
  }));
}

function buildLesson(sentenceTexts, timings) {
  const publicDir = ensurePublicDir(LESSON_ID, ROOT);
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
      audioUrl: audioUrl(LESSON_ID, `s${sid}.mp3`),
      words,
      blanks,
      _start: timings[idx]?.start,
      _end: timings[idx]?.end,
    };
  });

  const lesson = {
    id: LESSON_ID,
    title: "Air Show on Memorial Day",
    subtitle: "纪念日的飞行表演",
    fullAudioUrl: audioUrl(LESSON_ID, "full.mp3"),
    fullVideoUrl: audioUrl(LESSON_ID, "full.mp4"),
    vocabulary: pickVocabulary(sentences),
    sentences,
  };

  return { lesson, publicDir };
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
}

function writeFullAudio(mediaPath, fullMp3Out) {
  runFfmpeg(["-y", "-i", mediaPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", fullMp3Out]);
}

function writeFullVideo(mediaPath, fullMp4Out) {
  runFfmpeg([
    "-y",
    "-i",
    mediaPath,
    "-c:v",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "medium",
    "-vf",
    "scale=-2:720",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-movflags",
    "+faststart",
    fullMp4Out,
  ]);
}

function cutAudio(input, output, start, end) {
  spawnSync(
    FFMPEG,
    ["-y", "-i", input, "-ss", String(start), "-to", String(end), "-c:a", "libmp3lame", "-q:a", "4", output],
    { stdio: "inherit" },
  );
}

async function enrichWithOpenAI(lesson) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn("OPENAI_API_KEY not set; run patch-lesson-enrich + enrich-word-glosses after.");
    return lesson;
  }

  const payload = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You enrich an English lesson JSON about a US Air Force F-22 demo team interview at Memorial Day air show.
Return { vocabulary, sentences } with chinese (sentence-level), ipa (slash notation), english gloss, meaningInContext for vocab.
Keep all ids unchanged. Vocabulary: 5 hardest non-trivial words for Chinese learners.`,
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
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
      if (tw && w.ipa) {
        tw.ipa = w.ipa;
        tw.chinese = w.chinese ?? "";
        tw.english = w.english ?? "";
      }
    }
  }

  return lesson;
}

function loadExistingMetadata() {
  const js = path.join(ROOT, "src", "data", `${LESSON_ID}.js`);
  if (!fs.existsSync(js)) return {};
  const src = fs.readFileSync(js, "utf8");
  const m = src.match(/export const lesson002 = (\{[\s\S]*\});/);
  if (!m) return {};
  const old = JSON.parse(m[1]);
  return {
    title: old.title,
    subtitle: old.subtitle,
    briefing: old.briefing,
    briefingDate: old.briefingDate,
    headerImageUrl: old.headerImageUrl,
    videoPosterUrl: old.videoPosterUrl,
    vocabulary: old.vocabulary,
  };
}

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
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

async function main() {
  loadDotEnv();

  if (!fs.existsSync(MEDIA)) {
    console.error("Missing", MEDIA);
    process.exit(1);
  }

  const captionLines = loadCaptions();
  console.log(`Captions: ${captionLines.length} sentences`);

  const publicDirEarly = path.join(ROOT, "public", "lessons", LESSON_ID);
  const existingFullMp3 = path.join(publicDirEarly, "full.mp3");
  const alignMp3 = fs.existsSync(existingFullMp3)
    ? existingFullMp3
    : (() => {
        const tmpMp3 = path.join(ROOT, "scripts", ".whisper-out", "_align_input.mp3");
        fs.mkdirSync(path.dirname(tmpMp3), { recursive: true });
        writeFullAudio(MEDIA, tmpMp3);
        return tmpMp3;
      })();

  const segments = loadWhisperSegments(alignMp3);
  const timings = alignFromWhisperSegments(captionLines, segments);

  const { lesson, publicDir } = buildLesson(captionLines, timings);

  const fullMp3 = path.join(publicDir, "full.mp3");
  const fullMp4 = path.join(publicDir, "full.mp4");
  writeFullAudio(MEDIA, fullMp3);
  writeFullVideo(MEDIA, fullMp4);
  console.log("Wrote", fullMp3, fullMp4);

  for (const s of lesson.sentences) {
    if (s._start == null) continue;
    const out = path.join(publicDir, `${s.id}.mp3`);
    cutAudio(MEDIA, out, s._start, s._end);
    delete s._start;
    delete s._end;
    console.log("Clip", out);
  }

  await enrichWithOpenAI(lesson);

  Object.assign(lesson, loadExistingMetadata());
  for (const v of lesson.vocabulary) {
    if (!v.audioUrl) v.audioUrl = audioUrl(LESSON_ID, `${v.id}.m4a`);
  }

  // Remove stale sentence clips when sentence count shrinks.
  for (const f of fs.readdirSync(publicDir)) {
    const m = /^s(\d+)\.mp3$/.exec(f);
    if (m && Number(m[1]) > lesson.sentences.length) {
      fs.unlinkSync(path.join(publicDir, f));
      console.log("Removed stale", f);
    }
  }

  const outJs = path.join(ROOT, "src", "data", "lesson002.js");
  emitLessonJs(lesson, outJs);
  console.log("Wrote", outJs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
