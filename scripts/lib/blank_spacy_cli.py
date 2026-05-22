#!/usr/bin/env python3
"""CLI: JSON stdin { "sentence": "...", "level": "2" } → blanked sentence on stdout."""
import json
import sys

import spacy

from blank_out_designated_words import blank_out_designated_words

_NLP = None


def get_nlp():
    global _NLP
    if _NLP is None:
        _NLP = spacy.load("en_core_web_sm")
    return _NLP


def main():
    payload = json.load(sys.stdin)
    sentence = payload["sentence"]
    level = str(payload["level"])
    nlp = get_nlp()
    sys.stdout.write(blank_out_designated_words(sentence, level, nlp))


if __name__ == "__main__":
    main()
