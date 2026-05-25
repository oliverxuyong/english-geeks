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
import ffmpegStatic from "ffmpeg-static";
import { splitSentences, tokenizeWords, padId, buildWordRecords } from "./lib/tokenize.mjs";
import { buildBlanksWithSpacy } from "./lib/spacyBlankRules.mjs";
import { emitLessonJs, ensurePublicDir, audioUrl } from "./lib/emitLesson.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

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

loadDotEnv();

const FFMPEG = (() => {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return "ffmpeg";
  } catch {
    return ffmpegStatic ?? "ffmpeg";
  }
})();

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

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v"]);

function isVideoFile(filePath) {
  return VIDEO_EXT.has(path.extname(filePath).toLowerCase());
}

function hasFfmpeg() {
  return Boolean(FFMPEG && fs.existsSync(FFMPEG));
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ffmpeg ${args.join(" ")}`);
  }
}

/** Extract full-length MP3 from video or copy audio file as full.mp3 */
function writeFullAudio(mediaPath, fullMp3Out) {
  if (isVideoFile(mediaPath)) {
    runFfmpeg(["-y", "-i", mediaPath, "-vn", "-acodec", "libmp3lame", "-q:a", "4", fullMp3Out]);
  } else {
    runFfmpeg(["-y", "-i", mediaPath, "-acodec", "libmp3lame", "-q:a", "4", fullMp3Out]);
  }
}

/** Copy or transcode video to full.mp4 for Step 4 */
function writeFullVideo(mediaPath, fullMp4Out) {
  const ext = path.extname(mediaPath).toLowerCase();
  if (ext === ".mp4") {
    fs.copyFileSync(mediaPath, fullMp4Out);
    return;
  }
  runFfmpeg(["-y", "-i", mediaPath, "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", fullMp4Out]);
}

function envWithFfmpeg() {
  const ffmpegDir = path.dirname(FFMPEG);
  return { ...process.env, PATH: `${ffmpegDir}${path.delimiter}${process.env.PATH ?? ""}` };
}

function transcribeLocalWhisper(mediaPath) {
  const python = process.env.PYTHON ?? "python3";
  const outDir = path.join(ROOT, "scripts", ".whisper-out");
  fs.mkdirSync(outDir, { recursive: true });

  let audioForWhisper = mediaPath;
  if (isVideoFile(mediaPath) && hasFfmpeg()) {
    audioForWhisper = path.join(outDir, "_whisper_input.mp3");
    writeFullAudio(mediaPath, audioForWhisper);
  }

  console.log("Path A: local Whisper (openai-whisper) — slower than API; install: pip install openai-whisper");
  const result = spawnSync(
    python,
    [
      "-m",
      "whisper",
      audioForWhisper,
      "--model",
      process.env.WHISPER_MODEL ?? "base",
      "--output_format",
      "json",
      "--output_dir",
      outDir,
    ],
    { stdio: "inherit", encoding: "utf8", env: envWithFfmpeg() }
  );

  if (result.status !== 0) {
    throw new Error(
      "Local Whisper failed. Set OPENAI_API_KEY for API transcription, or: pip install openai-whisper"
    );
  }

  const jsonPath = path.join(
    outDir,
    `${path.basename(audioForWhisper, path.extname(audioForWhisper))}.json`,
  );
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Local Whisper output not found: ${jsonPath}`);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  return {
    segments: (data.segments ?? []).map((seg) => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
    })),
  };
}

async function transcribeWhisperApi(mediaPath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY required for Whisper API transcription (--media).");
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

async function transcribeWhisper(mediaPath) {
  if (process.env.OPENAI_API_KEY) {
    return transcribeWhisperApi(mediaPath);
  }
  console.warn("OPENAI_API_KEY not set; using local openai-whisper.");
  return transcribeLocalWhisper(mediaPath);
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
    FFMPEG,
    ["-y", "-i", input, "-ss", String(start), "-to", String(end), "-c:a", "libmp3lame", "-q:a", "4", output],
    { stdio: "inherit" }
  );
}

const VOCAB_STOP = new Set([
  "about", "after", "again", "being", "could", "every", "everyone", "first",
  "going", "great", "having", "honest", "honestly", "really", "right", "should",
  "something", "still", "thank", "thanks", "their", "there", "these", "think",
  "those", "through", "today", "together", "truth", "truthfully", "understand",
  "under", "until", "watching", "we're", "weve", "what", "when", "where", "which",
  "while", "with", "without", "would", "you're", "your", "yours", "able", "actually",
  "because", "before", "being", "doing", "going", "pretty", "quite", "some", "such",
  "that", "this", "they", "them", "then", "than", "have", "been", "were", "here",
  "just", "like", "last", "life", "live", "make", "many", "more", "most", "much",
  "only", "other", "over", "same", "someone", "take", "takes", "team", "teams",
  "tell", "time", "times", "very", "want", "weekend", "women", "fantastic", "absolutely",
]);

function normalizeVocabKey(text) {
  return text.toLowerCase().replace(/[^a-z']/g, "");
}

function vocabularyDifficulty(key) {
  if (key.length < 5 || VOCAB_STOP.has(key)) return -1;
  let score = key.length;
  if (key.length >= 9) score += 4;
  else if (key.length >= 7) score += 2;
  if (/(tion|ment|ance|ence|ship|ious|able|ical|ative)$/.test(key)) score += 3;
  if (/(ph|gh|str|scr|squ)/.test(key)) score += 1;
  return score;
}

function pickVocabulary(sentences, max = 5) {
  const freq = new Map();
  for (const s of sentences) {
    for (const w of s.words) {
      const key = normalizeVocabKey(w.text);
      const difficulty = vocabularyDifficulty(key);
      if (difficulty < 0) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...freq.entries()]
    .map(([word, count]) => ({
      word,
      score: vocabularyDifficulty(word) / Math.sqrt(count),
    }))
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
    const fullMp3 = path.join(publicDir, "full.mp3");
    writeFullAudio(mediaPath, fullMp3);
    console.log("Wrote", fullMp3);

    if (isVideoFile(mediaPath)) {
      const fullMp4 = path.join(publicDir, "full.mp4");
      writeFullVideo(mediaPath, fullMp4);
      lesson.fullVideoUrl = audioUrl(opts.id, "full.mp4");
      console.log("Wrote", fullMp4);
    }

    for (const s of lesson.sentences) {
      if (s._start == null) continue;
      const out = path.join(publicDir, `${s.id}.mp3`);
      cutAudio(mediaPath, out, s._start, s._end);
      delete s._start;
      delete s._end;
    }
  } else if (mediaPath) {
    console.warn("ffmpeg not found; skipped full audio, video, and per-sentence clips.");
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
