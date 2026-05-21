#!/usr/bin/env bash
# Generate per-sentence clips on macOS: say → AIFF → M4A (afconvert).
# Reads sentences from src/data/lesson001.js. Output: public/lessons/lesson001/sNNN.m4a
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/lessons/lesson001"
LESSON="$ROOT/src/data/lesson001.js"
TMP="${TMPDIR:-/tmp}/eg-sentence-aiff-$$"
mkdir -p "$DIR" "$TMP"
trap 'rm -rf "$TMP"' EXIT

if [[ ! -f "$LESSON" ]]; then
  echo "Missing $LESSON" >&2
  exit 1
fi

gen() {
  local id="$1" text="$2"
  say -v Samantha -o "$TMP/${id}.aiff" "$text"
  afconvert "$TMP/${id}.aiff" "$TMP/${id}.m4a" -f m4af -d "aac "
  cp "$TMP/${id}.m4a" "$DIR/${id}.m4a"
  echo "  $DIR/${id}.m4a ($(wc -c <"$DIR/${id}.m4a" | tr -d ' ') bytes)"
}

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('$LESSON', 'utf8');
const m = src.match(/export const lesson001 = (\{[\s\S]*\});/);
if (!m) throw new Error('lesson001 export not found');
const lesson = JSON.parse(m[1]);
for (const s of lesson.sentences) {
  const text = s.english.replace(/'/g, \"'\\\\''\");
  console.log(s.id + '\t' + text);
}
" | while IFS=$'\t' read -r id text; do
  gen "$id" "$text"
done

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const path = '$LESSON';
let src = readFileSync(path, 'utf8');
src = src.replace(/\\/lessons\\/lesson001\\/s([0-9]+)\\.mp3/g, '/lessons/lesson001/s\$1.m4a');
writeFileSync(path, src);
console.log('Updated sentence audioUrl paths in', path);
"

echo "Done."
