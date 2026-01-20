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
      return "Microphone access denied. Please allow microphone access in your browser settings.";
    case "audio-capture":
      return "No microphone found. Please connect a microphone and try again.";
    case "network":
      return "Speech recognition network error. Please check your internet connection.";
    case "no-speech":
      return "No speech detected. Please speak clearly and try again.";
    case "aborted":
      return "Speech recognition was cancelled.";
    case "service-not-allowed":
      return "Speech recognition service is not allowed. Please use HTTPS.";
    default:
      return "Voice transcription error. Please try again.";
  }
}

/**
 * Enhanced Speech-to-Text using the browser Web Speech API.
 * Includes automatic restart on unexpected stops, timeout handling,
 * and better error recovery.
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
  const shouldRestartRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup timeouts
  const clearTimeouts = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
  }, []);

  // Use ref to track listening state for callbacks to avoid stale closures
  const isListeningRef = useRef(false);
  
  // Keep ref in sync with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Reset no-speech timeout (called when speech is detected)
  const resetNoSpeechTimeout = useCallback(() => {
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
    }
    // Set a 30-second timeout for no speech - auto stop to save resources
    noSpeechTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current && isListeningRef.current) {
        console.log("[SpeechRecognition] No speech for 30s, stopping");
        shouldRestartRef.current = false;
        recognitionRef.current.stop();
      }
    }, 30000);
  }, []);

  const ensureRecognition = useCallback(() => {
    if (!RecognitionCtor) return null;
    
    // Always create a fresh instance to avoid state issues
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as any).abort?.() || recognitionRef.current.stop();
      } catch {
        // Ignore abort errors
      }
    }

    const recognition = new RecognitionCtor();
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Continuous mode for ongoing speech
    (recognition as any).continuous = true;

    (recognition as any).onstart = () => {
      console.log("[SpeechRecognition] Started listening");
      setIsConnecting(false);
      setIsListening(true);
      onStartRef.current?.();
      resetNoSpeechTimeout();
    };

    (recognition as any).onend = () => {
      console.log("[SpeechRecognition] Ended", { shouldRestart: shouldRestartRef.current });
      
      // Auto-restart if we're supposed to keep listening (continuous mode)
      if (shouldRestartRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            console.log("[SpeechRecognition] Auto-restarting...");
            recognition.start();
          } catch (e) {
            console.warn("[SpeechRecognition] Auto-restart failed", e);
            setIsListening(false);
            setIsConnecting(false);
            shouldRestartRef.current = false;
            clearTimeouts();
            onEndRef.current?.();
          }
        }, 100);
        return;
      }
      
      setIsConnecting(false);
      setIsListening(false);
      clearTimeouts();
      onEndRef.current?.();
    };

    recognition.onresult = (event: any) => {
      // Reset no-speech timeout since we're getting results
      resetNoSpeechTimeout();

      // Some mobile browsers re-send previous segments, so we build a stable
      // "final + interim" display and only emit when it changes.
      const results: any[] = Array.from(event.results || []);

      const finalParts: string[] = [];
      let interimText = "";

      for (const res of results) {
        const text: string = (res?.[0]?.transcript || "").trim();
        if (!text) continue;

        if (res.isFinal) {
          finalParts.push(text);
        } else {
          // Keep the most recent interim chunk
          interimText = text;
        }
      }

      const finalText = finalParts.join(" ").replace(/\s+/g, " ").trim();
      const display = [finalText, interimText]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      // Avoid spamming the UI with identical repeats
      const lastEmitted = (recognitionRef.current as any)?._lastEmittedTranscript as string | undefined;
      if (display && display === lastEmitted) return;
      if (recognitionRef.current) {
        (recognitionRef.current as any)._lastEmittedTranscript = display;
      }

      // If we have a final transcript and no interim, treat as final.
      // This prevents repeated/duplicated text on Android and iOS.
      if (finalText && !interimText) {
        finalTranscriptRef.current = finalText;
        onTranscriptRef.current(finalText, true);

        // Stop after final to keep chat input clean (user can tap mic again).
        shouldRestartRef.current = false;
        try {
          recognitionRef.current?.stop();
        } catch {
          // ignore
        }
        return;
      }

      if (display) {
        finalTranscriptRef.current = finalText;
        onTranscriptRef.current(display, false);
      }
    };

    (recognition as any).onspeechstart = () => {
      console.log("[SpeechRecognition] Speech detected");
      resetNoSpeechTimeout();
    };

    (recognition as any).onspeechend = () => {
      console.log("[SpeechRecognition] Speech ended");
      // Keep listening for more speech
      resetNoSpeechTimeout();
    };

    recognition.onerror = (event: any) => {
      console.error("[SpeechRecognition] Error:", event.error);
      
      // Handle specific errors
      if (event.error === "no-speech") {
        // Don't stop completely on no-speech, let it continue listening
        if (shouldRestartRef.current) {
          return;
        }
      }
      
      if (event.error === "aborted" && shouldRestartRef.current) {
        // Ignore aborted errors during intentional restarts
        return;
      }
      
      setIsConnecting(false);
      setIsListening(false);
      shouldRestartRef.current = false;
      clearTimeouts();
      onErrorRef.current(mapSpeechError(event));
    };

    (recognition as any).onaudiostart = () => {
      console.log("[SpeechRecognition] Audio capture started");
    };

    (recognition as any).onaudioend = () => {
      console.log("[SpeechRecognition] Audio capture ended");
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [RecognitionCtor, clearTimeouts, resetNoSpeechTimeout]);

  const start = useCallback(async () => {
    if (!isSupported) {
      onErrorRef.current("Voice input is not supported on this browser/device. Try Chrome on Android or desktop.");
      return;
    }

    // Toggle behavior: if active, stop
    if (isListening || isConnecting) {
      shouldRestartRef.current = false;
      clearTimeouts();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      // Stop the stream - we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      console.error("[SpeechRecognition] Mic permission error:", error);
      if (error.name === "NotAllowedError") {
        onErrorRef.current("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        onErrorRef.current("No microphone found. Please connect a microphone.");
      } else {
        onErrorRef.current("Could not access microphone. Please check your settings.");
      }
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) {
      onErrorRef.current("Voice input is not supported on this browser/device.");
      return;
    }

    // Reset state
    finalTranscriptRef.current = "";
    shouldRestartRef.current = true;
    recognition.lang = languageCode || "en-IN";

    try {
      setIsConnecting(true);
      console.log("[SpeechRecognition] Starting with language:", recognition.lang);
      recognition.start();
    } catch (e: any) {
      console.warn("[SpeechRecognition] Start failed:", e);
      setIsConnecting(false);
      shouldRestartRef.current = false;
      
      if (e.message?.includes("already started")) {
        // Already running, try to stop and restart
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
      } else {
        onErrorRef.current("Failed to start voice input. Please try again.");
      }
    }
  }, [ensureRecognition, isConnecting, isListening, isSupported, languageCode, clearTimeouts]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimeouts();

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    } else {
      // If there's no instance, still reflect stop in UI
      setIsConnecting(false);
      setIsListening(false);
      onEndRef.current?.();
    }
  }, [clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      clearTimeouts();
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as any).abort?.() || recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, [clearTimeouts]);

  return {
    isSupported,
    isListening,
    isConnecting,
    start,
    stop,
  };
}
