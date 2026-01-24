import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface UseBrowserSpeechRecognitionOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  languageCode?: string;
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
      return "Network error. Please check your internet connection.";
    case "no-speech":
      return "No speech detected. Please try again.";
    case "aborted":
      return "Voice input was cancelled.";
    default:
      return "Voice input error. Please try again.";
  }
}

/**
 * Simple Speech-to-Text using Web Speech API.
 * Standard chatbot behavior: tap to start, speak, tap send when done.
 */
export function useBrowserSpeechRecognition({
  onTranscript,
  onError,
  onStart,
  onEnd,
  languageCode,
}: UseBrowserSpeechRecognitionOptions) {
  // State hooks first
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Memoized values
  const RecognitionCtor = useMemo(() => getRecognitionCtor(), []);
  const isSupported = !!RecognitionCtor;

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedFinalRef = useRef<string>(""); // Accumulated final transcript parts
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedManuallyRef = useRef(false); // Track if stopped manually (to skip final callback)
  
  // Silence timeout duration (25 seconds - gives time to think)
  const SILENCE_TIMEOUT_MS = 25000;

  // Callback refs for stable references
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

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const resetSilenceTimeout = useCallback(() => {
    clearSilenceTimeout();
    silenceTimeoutRef.current = setTimeout(() => {
      console.log("[Speech] Silence timeout - stopping");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimeout]);

  const createRecognition = useCallback(() => {
    if (!RecognitionCtor) return null;

    // Clean up existing instance
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as any).abort?.() || recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }

    const recognition = new RecognitionCtor();
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Non-continuous mode for cleaner results (stops after pause)
    (recognition as any).continuous = false;

    (recognition as any).onstart = () => {
      console.log("[Speech] Started");
      setIsConnecting(false);
      setIsListening(true);
      accumulatedFinalRef.current = "";
      stoppedManuallyRef.current = false;
      resetSilenceTimeout();
      onStartRef.current?.();
    };

    (recognition as any).onend = () => {
      console.log("[Speech] Ended, stoppedManually:", stoppedManuallyRef.current);
      clearSilenceTimeout();
      setIsConnecting(false);
      setIsListening(false);
      
      // Only emit final transcript if not stopped manually (to prevent duplicates)
      if (!stoppedManuallyRef.current && accumulatedFinalRef.current) {
        onTranscriptRef.current(accumulatedFinalRef.current, true);
      }
      
      onEndRef.current?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Reset silence timeout on any speech activity
      resetSilenceTimeout();
      
      // Build transcript from results
      // In non-continuous mode, results don't accumulate across sessions
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        
        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      // Store final transcript for the onend callback
      if (finalText) {
        accumulatedFinalRef.current = finalText.trim();
      }

      // Display current state (final + interim) for real-time feedback
      const display = (finalText + interimText).trim();
      if (display) {
        onTranscriptRef.current(display, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[Speech] Error:", event.error);
      clearSilenceTimeout();
      
      // Ignore no-speech as it's normal when user doesn't speak
      if (event.error === "no-speech") {
        setIsConnecting(false);
        setIsListening(false);
        onEndRef.current?.();
        return;
      }

      setIsConnecting(false);
      setIsListening(false);
      onErrorRef.current(mapSpeechError(event));
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [RecognitionCtor, resetSilenceTimeout, clearSilenceTimeout]);

  const start = useCallback(async () => {
    if (!isSupported) {
      onErrorRef.current("Voice input not supported. Try Chrome browser.");
      return;
    }

    // If already active, stop it
    if (isListening || isConnecting) {
      if (recognitionRef.current) {
        stoppedManuallyRef.current = true;
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      return;
    }

    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      if (error.name === "NotAllowedError") {
        onErrorRef.current("Microphone access denied.");
      } else {
        onErrorRef.current("Could not access microphone.");
      }
      return;
    }

    const recognition = createRecognition();
    if (!recognition) {
      onErrorRef.current("Voice input not available.");
      return;
    }

    recognition.lang = languageCode || "en-IN";
    accumulatedFinalRef.current = "";
    stoppedManuallyRef.current = false;

    try {
      setIsConnecting(true);
      console.log("[Speech] Starting with lang:", recognition.lang);
      recognition.start();
    } catch (e) {
      console.error("[Speech] Start failed:", e);
      setIsConnecting(false);
      onErrorRef.current("Failed to start voice input.");
    }
  }, [createRecognition, isConnecting, isListening, isSupported, languageCode]);

  const stop = useCallback(() => {
    // Mark as manually stopped to prevent duplicate transcript emission
    stoppedManuallyRef.current = true;
    clearSilenceTimeout();
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsConnecting(false);
    setIsListening(false);
  }, [clearSilenceTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSilenceTimeout();
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as any).abort?.() || recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, [clearSilenceTimeout]);

  return {
    isSupported,
    isListening,
    isConnecting,
    start,
    stop,
  };
}
