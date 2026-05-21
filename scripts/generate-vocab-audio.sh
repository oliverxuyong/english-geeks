#!/usr/bin/env bash
# Generate vocab clips on macOS: say → AIFF → M4A (afconvert). Output: public/lessons/lesson001/v00N.m4a
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/lessons/lesson001"
TMP="${TMPDIR:-/tmp}/eg-vocab-aiff-$$"
mkdir -p "$DIR" "$TMP"
trap 'rm -rf "$TMP"' EXIT

gen() {
  local id="$1" word="$2"
  say -v Samantha -o "$TMP/${id}.aiff" "$word"
  afconvert "$TMP/${id}.aiff" "$TMP/${id}.m4a" -f m4af -d aac
  cp "$TMP/${id}.m4a" "$DIR/${id}.m4a"
  echo "  $DIR/${id}.m4a ($(wc -c <"$DIR/${id}.m4a" | tr -d ' ') bytes)"
}

gen v001 gastronomy
gen v002 blasphemous
gen v003 Neapolitans
gen v004 cappuccino
gen v005 digestion
echo "Done."
