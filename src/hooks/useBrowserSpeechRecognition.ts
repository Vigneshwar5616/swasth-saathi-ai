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
 * Standard chatbot behavior: tap to start, speak, auto-stops when you pause.
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
  const transcriptRef = useRef<string>("");

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
    // Non-continuous: stops automatically after speech ends
    (recognition as any).continuous = false;

    (recognition as any).onstart = () => {
      console.log("[Speech] Started");
      setIsConnecting(false);
      setIsListening(true);
      transcriptRef.current = "";
      onStartRef.current?.();
    };

    (recognition as any).onend = () => {
      console.log("[Speech] Ended");
      setIsConnecting(false);
      setIsListening(false);
      
      // Emit final transcript if we have one
      if (transcriptRef.current) {
        onTranscriptRef.current(transcriptRef.current, true);
      }
      
      onEndRef.current?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript || "";
        
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      // Update stored transcript
      if (finalTranscript) {
        transcriptRef.current = finalTranscript.trim();
      }

      // Show current state (final + interim) in real-time
      const display = (finalTranscript + interimTranscript).trim();
      if (display) {
        onTranscriptRef.current(display, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[Speech] Error:", event.error);
      
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
  }, [RecognitionCtor]);

  const start = useCallback(async () => {
    if (!isSupported) {
      onErrorRef.current("Voice input not supported. Try Chrome browser.");
      return;
    }

    // If already active, stop it
    if (isListening || isConnecting) {
      if (recognitionRef.current) {
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
        audio: { echoCancellation: true, noiseSuppression: true }
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
    transcriptRef.current = "";

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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    setIsConnecting(false);
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as any).abort?.() || recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    isConnecting,
    start,
    stop,
  };
}
