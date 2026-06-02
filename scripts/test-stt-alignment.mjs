import {
  alignTranscriptToReference,
  findMatchedWordIndexes,
  tokensFuzzyMatch,
} from "../src/utils/lcsMatch.js";
import { buildPhraseList, canUseSpeechPhrases } from "../src/utils/speechPhrases.js";

const words = [
  { text: "enlistment" },
  { text: "they're" },
  { text: "flying" },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(tokensFuzzyMatch("enlistment", "enlist"), "prefix fuzzy match");
assert(!tokensFuzzyMatch("the", "and"), "short words should not fuzzy match");

const aligned = alignTranscriptToReference(words, "during my enlist flying");
assert(aligned.includes("enlistment"), "align should correct enlist -> enlistment");

const matched = findMatchedWordIndexes(words, "during my enlist flying");
assert(matched.has(0), "enlistment blank should match after alignment");
assert(matched.has(2), "flying should still match");

const phrases = buildPhraseList(
  "During my enlistment I love flying.",
  words,
);
assert(phrases[0].phrase.includes("enlistment"), "sentence phrase first");
assert(phrases.some((p) => p.phrase === "enlistment"), "hard word phrase included");

assert(typeof canUseSpeechPhrases === "function", "canUseSpeechPhrases export");

console.log("test-stt-alignment: ok");
