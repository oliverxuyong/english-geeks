#!/usr/bin/env node
/**
 * Re-cut s001–s014.mp3 from scripts/lesson002.mp4 using Whisper segment timings.
 * Maps 14 sentences in src/data/lesson002.js → whisper segments in .whisper-out/full.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

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

const MEDIA = path.join(ROOT, "scripts", "lesson002.mp4");
const WHISPER_JSON = path.join(ROOT, "scripts", ".whisper-out", "full.json");
const LESSON_JS = path.join(ROOT, "src", "data", "lesson002.js");
const OUT_DIR = path.join(ROOT, "public", "lessons", "lesson002");

/** 10 caption sentences → Whisper segment ids (0-based). */
const SEGMENT_GROUPS = [
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

function loadLesson() {
  const src = fs.readFileSync(LESSON_JS, "utf8");
  const m = src.match(/export const lesson002 = (\{[\s\S]*\});/);
  if (!m) throw new Error("lesson002 export not found");
  return JSON.parse(m[1]);
}

function timingForGroup(ids, segments) {
  const byId = new Map(segments.map((s) => [s.id, s]));
  const segs = ids.map((id) => byId.get(id)).filter(Boolean);
  if (!segs.length) return null;
  return {
    start: Math.max(0, segs[0].start - PAD_START),
    end: segs[segs.length - 1].end + PAD_END,
  };
}

function cutAudio(input, output, start, end) {
  const result = spawnSync(
    FFMPEG,
    ["-y", "-i", input, "-ss", String(start), "-to", String(end), "-c:a", "libmp3lame", "-q:a", "4", output],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed for ${output}`);
}

function main() {
  if (!fs.existsSync(MEDIA)) {
    console.error("Missing", MEDIA);
    process.exit(1);
  }
  if (!fs.existsSync(WHISPER_JSON)) {
    console.error("Missing", WHISPER_JSON, "— run rebuild-lesson002-from-captions.mjs once first.");
    process.exit(1);
  }

  const lesson = loadLesson();
  const sentenceCount = lesson.sentences.length;
  if (SEGMENT_GROUPS.length !== sentenceCount) {
    throw new Error(`Expected ${SEGMENT_GROUPS.length} segment groups, lesson has ${sentenceCount} sentences`);
  }

  const segments = JSON.parse(fs.readFileSync(WHISPER_JSON, "utf8")).segments ?? [];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let i = 0; i < sentenceCount; i++) {
    const s = lesson.sentences[i];
    const ids = SEGMENT_GROUPS[i];
    const timing = timingForGroup(ids, segments);
    if (!timing) {
      console.warn(`${s.id}: no segments matched for ids ${ids.join(",")}`);
      continue;
    }
    const out = path.join(OUT_DIR, `${s.id}.mp3`);
    cutAudio(MEDIA, out, timing.start, timing.end);
    console.log(`${s.id}: ${timing.start.toFixed(2)}–${timing.end.toFixed(2)}s (segments ${ids.join(",")}) → ${out}`);
  }

  console.log("Done. Regenerated", sentenceCount, "sentence clips.");
}

main();
