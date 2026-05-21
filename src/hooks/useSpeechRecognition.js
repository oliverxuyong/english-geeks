import { useCallback, useEffect, useRef, useState } from "react";
import { findMatchedWordIndexes } from "../utils/lcsMatch";

const SILENCE_MS = 1400;

function joinResultTranscripts(results, startIndex = 0) {
  const parts = [];
  for (let i = startIndex; i < results.length; i++) {
    let text = results[i][0].transcript.trim();
    if (!text) continue;
    if (parts.length > 0) {
      text = text.charAt(0).toLowerCase() + text.slice(1);
    }
    parts.push(text);
  }
  return parts.join(" ");
}

export function useSpeechRecognition({ words, onMatchUpdate }) {
  const [recognizedText, setRecognizedText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [attemptEnded, setAttemptEnded] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const wordsRef = useRef(words);
  const attemptEndedRef = useRef(false);
  const segmentStartIndexRef = useRef(0);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const scheduleAttemptEnd = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      attemptEndedRef.current = true;
      setAttemptEnded(true);
    }, SILENCE_MS);
  }, [clearSilenceTimer]);

  const clearRecognitionSession = useCallback(() => {
    segmentStartIndexRef.current = 0;
    setRecognizedText("");
    onMatchUpdate?.(new Set());
  }, [onMatchUpdate]);

  const stopSpeaking = useCallback(() => {
    shouldListenRef.current = false;
    clearSilenceTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    }
    recognitionRef.current = null;
    attemptEndedRef.current = false;
    setIsListening(false);
    setAttemptEnded(false);
    clearRecognitionSession();
  }, [clearRecognitionSession, clearSilenceTimer]);

  const startRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      if (attemptEndedRef.current) {
        attemptEndedRef.current = false;
        setAttemptEnded(false);
        segmentStartIndexRef.current = event.resultIndex;
        setRecognizedText("");
        onMatchUpdate?.(new Set());
      }

      const burstTranscript = joinResultTranscripts(
        event.results,
        segmentStartIndexRef.current,
      );

      setRecognizedText(burstTranscript);
      onMatchUpdate?.(
        findMatchedWordIndexes(wordsRef.current, burstTranscript),
      );
      scheduleAttemptEnd();
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopSpeaking();
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          /* restart on next user action */
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onMatchUpdate, scheduleAttemptEnd, stopSpeaking]);

  const startSpeaking = useCallback(() => {
    if (!window.isSecureContext) {
      alert(
        "Speech recognition requires HTTPS (or localhost). " +
          "On your phone, open the https:// address from the dev server terminal."
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      alert(
        isIos
          ? "Speech recognition is not available in Chrome on iPhone. Use Safari."
          : "Speech recognition is not supported in this browser."
      );
      return;
    }

    stopSpeaking();
    setAttemptEnded(false);
    shouldListenRef.current = true;
    setIsListening(true);
    startRecognition();
  }, [startRecognition, stopSpeaking]);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  return {
    recognizedText,
    isListening,
    attemptEnded,
    startSpeaking,
    stopSpeaking,
  };
}
