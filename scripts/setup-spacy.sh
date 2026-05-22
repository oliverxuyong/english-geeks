#!/usr/bin/env bash
# Local venv for spaCy blanking (avoids system Python permission issues).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv-spacy"

python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r "$ROOT/requirements-spacy.txt"
"$VENV/bin/python" -m spacy download en_core_web_sm

echo ""
echo "Done. Use spaCy blanks with:"
echo "  export PYTHON=$VENV/bin/python"
echo "  node scripts/apply-spacy-blanks.mjs"
