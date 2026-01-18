import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseBrowserSpeechRecognitionOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  languageCode?: string; // e.g. "hi-IN"
}

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function mapSpeechError(e: any): string {
  const code = e?.error || e?.name;
  switch (code) {
    case "not-allowed":
    case "NotAllowedError":
      return "Microphone access denied. Please allow microphone access.";
    case "audio-capture":
      return "No microphone found. Please connect a microphone.";
    case "network":
      return "Speech recognition network error. Please try again.";
    case "no-speech":
      return "No speech detected. Please try again.";
    default:
      return "Voice transcription error. Please try again.";
  }
}

/**
 * Free Speech-to-Text using the browser Web Speech API.
 * Note: Not supported on all browsers (e.g. iOS Safari).
 */
export function useBrowserSpeechRecognition({
  onTranscript,
  onError,
  onStart,
  onEnd,
  languageCode,
}: UseBrowserSpeechRecognitionOptions) {
  const RecognitionCtor = useMemo(() => getRecognitionCtor(), []);
  const isSupported = !!RecognitionCtor;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef<string>("");

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
  }, [onTranscript, onError, onStart, onEnd]);

  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const ensureRecognition = useCallback(() => {
    if (!RecognitionCtor) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new RecognitionCtor();
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // These properties exist in most implementations, but aren't in our minimal TS types
    (recognition as any).continuous = true;

    (recognition as any).onstart = () => {
      console.log("[SpeechRecognition] started");
      setIsConnecting(false);
      setIsListening(true);
      onStartRef.current?.();
    };

    (recognition as any).onend = () => {
      console.log("[SpeechRecognition] ended");
      setIsConnecting(false);
      setIsListening(false);
      onEndRef.current?.();
    };

    recognition.onresult = (event: any) => {
      // Build display string: finalized + current interim
      let interim = "";
      const resultIndex: number = typeof event.resultIndex === "number" ? event.resultIndex : 0;

      for (let i = resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text: string = (res?.[0]?.transcript || "").trim();
        if (!text) continue;

        if (res.isFinal) {
          finalTranscriptRef.current = finalTranscriptRef.current
            ? `${finalTranscriptRef.current} ${text}`
            : text;
          onTranscriptRef.current(finalTranscriptRef.current, true);
        } else {
          interim = interim ? `${interim} ${text}` : text;
        }
      }

      const display = [finalTranscriptRef.current, interim].filter(Boolean).join(" ").trim();
      if (display) {
        onTranscriptRef.current(display, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[SpeechRecognition] error", event);
      setIsConnecting(false);
      setIsListening(false);
      onErrorRef.current(mapSpeechError(event));
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [RecognitionCtor]);

  const start = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current("Voice input is not supported on this browser/device.");
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) {
      onErrorRef.current("Voice input is not supported on this browser/device.");
      return;
    }

    // Toggle behavior: if active, stop.
    if (isListening || isConnecting) {
      recognition.stop();
      return;
    }

    finalTranscriptRef.current = "";
    recognition.lang = languageCode || "en-IN";

    try {
      setIsConnecting(true);
      console.log("[SpeechRecognition] starting...", { lang: recognition.lang });
      recognition.start();
    } catch (e) {
      // Some browsers throw if start is called twice too fast.
      console.warn("[SpeechRecognition] start() failed", e);
      setIsConnecting(false);
      onErrorRef.current("Failed to start voice input. Please try again.");
    }
  }, [ensureRecognition, isConnecting, isListening, isSupported, languageCode]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    setIsConnecting(false);
    setIsListening(false);
    onEndRef.current?.();
  }, []);

  return {
    isSupported,
    isListening,
    isConnecting,
    start,
    stop,
  };
}
