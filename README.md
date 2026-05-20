# English Geeks / 英语极客

Interactive static web app for learning a short English passage: vocabulary → listen → cloze practice with speech recognition → final listen.

## Quick start

```bash
npm install
npm run dev
```

Open the **https://** URL printed in the terminal (Vite basic SSL). Speech recognition requires a secure context on phones — use that HTTPS network URL, not `http://`.

```bash
npm run build    # static output in dist/
npm run preview  # serve production build locally
```

Deploy `dist/` to GitHub Pages, Netlify, or any static host. Share the HTTPS link (e.g. WeChat article).

## Lesson data schema

See [docs/LESSON_SCHEMA.md](docs/LESSON_SCHEMA.md). Lessons live in `src/data/lessonXXX.js`; audio in `public/lessons/{lessonId}/` (`full.mp3`, `s001.mp3`, `v001.mp3`).

## Build a lesson (offline, on your Mac)

Pipeline script: `scripts/build-lesson.mjs` (not shipped to users).

### Path B — text only

```bash
node scripts/build-lesson.mjs \
  --text scripts/sample-passage.txt \
  --id lesson001 \
  --title "English Geeks" \
  --subtitle "英语极客"
```

Optional: `node scripts/patch-lesson-enrich.mjs` after editing `scripts/lesson001-enrich.json`.

### Path A — audio or video

Requires `OPENAI_API_KEY`, `ffmpeg` on PATH:

```bash
export OPENAI_API_KEY=sk-...
node scripts/build-lesson.mjs --media recording.mp3 --id lesson002 --enrich
```

Whisper provides segment timestamps; ffmpeg cuts `s001.mp3`, … and copies `full.mp3`.

### Blank rules

Deterministic in `scripts/lib/blankRules.mjs`: beginner hides ~last 25% of tokens; intermediate hides content words; advanced hides most with letter stubs.

### Enrich (optional)

`--enrich` calls OpenAI to fill Chinese, IPA, and glosses. Without it, run the patch script or edit the generated JS by hand.

## App features

| Step | Behavior |
|------|----------|
| 1 Vocabulary | Cards with 🔊 — MP3 from `audioUrl`, else `speechSynthesis` |
| 2 First listen | `fullAudioUrl`, play-once guard |
| 3 Practice | One card; tabs 初/中/高; ↑↓ swipe sentences, ←→ swipe levels; per-word IPA; Speak until Stop |
| 4 Final listen | Replay audio or `fullVideoUrl` |

## Mobile / HTTPS

- Dev: `@vitejs/plugin-basic-ssl` — always use the **https** LAN URL on iPhone/Android.
- iOS: Speech recognition works in **Safari**, not Chrome on iPhone.
- Production: host must be HTTPS for microphone access.

## Project layout

```
src/
  components/     # Vocabulary, Listening, Practice
  data/lesson001.js
  hooks/useSpeechRecognition.js
  utils/lcsMatch.js, playAudio.js
scripts/
  build-lesson.mjs
  lib/            # tokenize, blankRules, emitLesson
public/lessons/   # generated audio assets
docs/LESSON_SCHEMA.md
```

## About

Rebuild of the English Geeks React practice page for WeChat links, live demos, and lesson prep workflows. See `fullplan.md` for the full product roadmap.
