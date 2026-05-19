# Lesson JSON schema

Lessons live in `src/data/lessonXXX.js` and reference audio under `public/lessons/{lessonId}/`.

```js
{
  id: "lesson001",
  title: "English Geeks",
  subtitle: "英语极客",
  fullAudioUrl: "/lessons/lesson001/full.mp3",
  fullVideoUrl: "",              // optional, Step 4

  vocabulary: [{
    id: "v001",
    word: "interactive",
    ipa: "/ˌɪntərˈæktɪv/",
    chinese: "交互式的",
    english: "short dictionary gloss",
    meaningInContext: "meaning in this passage",
    audioUrl: "/lessons/lesson001/v001.mp3"   // optional
  }],

  sentences: [{
    id: "s001",
    index: 1,
    english: "Full sentence text.",
    chinese: "中文翻译",
    audioUrl: "/lessons/lesson001/s001.mp3",
    words: [{
      id: "s001-w001",           // s{NNN}-w{MMM}
      text: "Full",
      ipa: "/fʊl/",
      chinese: "完整的",
      english: "complete"
    }],
    blanks: {
      beginner: ["Full", "_____", ...],      // one token per words[] entry
      intermediate: [...],
      advanced: [...]
    }
  }]
}
```

## Conventions

- **Word IDs**: `s{sentenceIndex}-w{wordIndex}` (3-digit padding).
- **Blanks**: same length as `words[]`; each slot is either the visible token or a blank string (`____`, `_____`, or partial letters).
- **IPA**: per-word in `words[].ipa`; no sentence-level `ipa` field required.
- **Assets**: `public/lessons/{lessonId}/full.mp3`, `s001.mp3`, `v001.mp3`, optional `full.mp4`.

## Build pipeline

```bash
# Path B — pasted text (no media)
node scripts/build-lesson.mjs --text scripts/sample-passage.txt --id lesson001 --title "English Geeks"

# Path A — audio/video (needs OPENAI_API_KEY, ffmpeg)
node scripts/build-lesson.mjs --media path/to/recording.mp3 --id lesson002
```

See [README.md](../README.md) for environment variables and optional enrich APIs.
