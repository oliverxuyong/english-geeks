#!/usr/bin/env bash
# Generate vocab clips on macOS: say → AIFF → M4A (afconvert).
# Usage: ./scripts/generate-vocab-audio.sh [lessonId]
# Reads vocabulary from src/data/{lessonId}.js; output: public/lessons/{lessonId}/vNNN.m4a
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LESSON_ID="${1:-lesson001}"
DIR="$ROOT/public/lessons/$LESSON_ID"
LESSON="$ROOT/src/data/${LESSON_ID}.js"
TMP="${TMPDIR:-/tmp}/eg-vocab-aiff-$$"
mkdir -p "$DIR" "$TMP"
trap 'rm -rf "$TMP"' EXIT

if [[ ! -f "$LESSON" ]]; then
  echo "Missing $LESSON" >&2
  exit 1
fi

gen() {
  local id="$1" word="$2"
  say -v Samantha -o "$TMP/${id}.aiff" "$word"
  afconvert "$TMP/${id}.aiff" "$TMP/${id}.m4a" -f m4af -d "aac "
  cp "$TMP/${id}.m4a" "$DIR/${id}.m4a"
  echo "  $DIR/${id}.m4a ($(wc -c <"$DIR/${id}.m4a" | tr -d ' ') bytes)"
}

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const lessonId = '$LESSON_ID';
const path = '$LESSON';
const src = readFileSync(path, 'utf8');
const re = new RegExp('export const ' + lessonId + ' = (\\\\{[\\\\s\\\\S]*\\\\});');
const m = src.match(re);
if (!m) throw new Error(lessonId + ' export not found in ' + path);
const lesson = JSON.parse(m[1]);
for (const v of lesson.vocabulary) {
  const word = v.word.replace(/'/g, \"'\\\\''\");
  console.log(v.id + '\t' + word);
}
" | while IFS=$'\t' read -r id word; do
  gen "$id" "$word"
done

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
const lessonId = '$LESSON_ID';
const path = '$LESSON';
let src = readFileSync(path, 'utf8');
const re = new RegExp('/lessons/' + lessonId + '/(v[0-9]+)\\\\.mp3', 'g');
src = src.replace(re, '/lessons/' + lessonId + '/\$1.m4a');
writeFileSync(path, src);
console.log('Updated vocab audioUrl paths in', path);
"

echo "Done."
