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

**Production (Netlify + `englishgeeks.aigine.com`):** see [docs/DEPLOY_NETLIFY.md](docs/DEPLOY_NETLIFY.md). Repo includes `netlify.toml`; DNS CNAME on Alibaba Cloud points `englishgeeks` → your `*.netlify.app` site. Tencent (China) can be added later with split DNS.

## Lesson data schema

See [docs/LESSON_SCHEMA.md](docs/LESSON_SCHEMA.md). Lessons live in `src/data/lessonXXX.js`; audio in `public/lessons/{lessonId}/` (`full.mp3`, `s001.mp3`, `v001.mp3`).

## Build a lesson (offline, on your Mac)

Pipeline script: `scripts/build-lesson.mjs` (not shipped to users).

### Path B — text only

```bash
node scripts/build-lesson.mjs \
  --text scripts/lesson001-passage.txt \
  --id lesson001 \
  --title "English Geeks" \
  --subtitle "英语极客"
```

Optional after build:

```bash
node scripts/patch-lesson-enrich.mjs          # sentence Chinese + vocab cards
node scripts/apply-word-glosses.mjs           # per-word IPA / 中文 / English
node scripts/apply-spacy-blanks.mjs           # spaCy blanks (needs requirements-spacy.txt)
```

spaCy setup (one-time, for grammar-based blanks). Prefer the project venv (system `pip` often fails on macOS):

```bash
./scripts/setup-spacy.sh
export PYTHON="$(pwd)/.venv-spacy/bin/python"
node scripts/apply-spacy-blanks.mjs
```

Or with API: `OPENAI_API_KEY=... node scripts/enrich-word-glosses.mjs`

Per-sentence clips (Path B has no audio until you run one of these):

```bash
./scripts/generate-sentence-audio.sh   # macOS say → s001.m4a … (updates lesson URLs)
# Or Path A with --media + ffmpeg (Whisper timings, slices from source recording)
```

### Path A — audio or video

Requires `OPENAI_API_KEY`, `ffmpeg` on PATH:

```bash
export OPENAI_API_KEY=sk-...
node scripts/build-lesson.mjs --media recording.mp3 --id lesson002 --enrich
```

Whisper provides segment timestamps; ffmpeg cuts `s001.mp3`, … and copies `full.mp3`.

### Blank rules

Practice blanks: spaCy `scripts/lib/blank_out_designated_words.py` when installed (level **2** = beginner, **4** = intermediate, **5** = advanced); otherwise fallback in `scripts/lib/blankRules.mjs`.

### Enrich (optional)

`--enrich` calls OpenAI to fill Chinese, IPA, and glosses. Without it, run the patch script or edit the generated JS by hand.

## App features

| Step | Behavior |
|------|----------|
| 1 Vocabulary | Cards with 🔊 — MP3 from `audioUrl`, else `speechSynthesis` |
| 2 First listen | `fullAudioUrl`, play-once guard |
| 3 Practice | One card; tabs 初/中/高; ←→ swipe levels; Prev/Next sentence; per-word IPA; Speak until Stop |
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
  lib/            # tokenize, blank_out_designated_words.py, spacyBlankRules, emitLesson
public/lessons/   # generated audio assets
docs/LESSON_SCHEMA.md
```

## About

Rebuild of the English Geeks React practice page for WeChat links, live demos, and lesson prep workflows. See `fullplan.md` for the full product roadmap.
