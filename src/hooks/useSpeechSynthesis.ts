import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisOptions {
  defaultLanguage?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, language?: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

/**
 * Enhanced Text-to-Speech hook using Web Speech API.
 * Handles iOS quirks, voice selection, and provides better control.
 */
export function useSpeechSynthesis({
  defaultLanguage = "en-IN",
  rate = 0.9,
  pitch = 1.0,
  volume = 1.0,
  onStart,
  onEnd,
  onError,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  
  // Keep iOS speech synthesis alive - it pauses when tab loses focus
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const isSupported = !!synth && typeof synth.speak === "function";

  // Update refs when callbacks change
  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onStart, onEnd, onError]);

  // Load voices
  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
      }
    };

    // Initial load
    loadVoices();

    // Chrome loads voices asynchronously
    synth.addEventListener("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
    };
  }, [synth]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
      if (synth) {
        synth.cancel();
      }
    };
  }, [synth]);

  // Find the best matching voice for a language
  const findVoice = useCallback((lang: string): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // Try exact match first
    let voice = voices.find(v => v.lang === lang);
    if (voice) return voice;

    // Try language family match (e.g., "hi" for "hi-IN")
    const langBase = lang.split("-")[0].toLowerCase();
    voice = voices.find(v => v.lang.toLowerCase().startsWith(langBase));
    if (voice) return voice;

    // For Indian languages, try Google voices first (better quality)
    voice = voices.find(v => 
      v.lang.toLowerCase().startsWith(langBase) &&
      v.name.toLowerCase().includes("google")
    );
    if (voice) return voice;

    // Fallback to any matching voice
    voice = voices.find(v => v.lang.toLowerCase().startsWith(langBase));
    if (voice) return voice;

    // Last resort: default voice or first available
    return voices.find(v => v.default) || voices[0] || null;
  }, [voices]);

  const speak = useCallback((text: string, language?: string) => {
    if (!synth || !text || !text.trim()) {
      console.log("[TTS] No synth or empty text");
      return;
    }

    // Stop any current speech
    synth.cancel();
    setIsPaused(false);
    
    // Clear any existing keep-alive
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    // Clean up the text for better pronunciation
    const cleanText = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "") // Remove markdown italic
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\n+/g, ". ") // Replace newlines with pauses
      .replace(/\s+/g, " ") // Normalize spaces
      .replace(/•/g, ",") // Replace bullets
      .replace(/\[\d+\]/g, "") // Remove citation numbers
      .replace(/\.{2,}/g, ".") // Multiple periods to single
      .replace(/\.\s*\./g, ".") // Clean double periods
      .trim();

    if (!cleanText) {
      console.log("[TTS] No clean text to speak");
      return;
    }

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language || defaultLanguage;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Find and set the best voice
    const voice = findVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
      console.log("[TTS] Using voice:", voice.name, voice.lang);
    }

    utterance.onstart = () => {
      console.log("[TTS] Started speaking");
      setIsSpeaking(true);
      setIsPaused(false);
      onStartRef.current?.();
      
      // iOS keep-alive: resume if it auto-pauses
      keepAliveIntervalRef.current = setInterval(() => {
        if (synth.paused && !isPaused) {
          console.log("[TTS] Resuming auto-paused speech");
          synth.resume();
        }
      }, 100);
    };

    utterance.onend = () => {
      console.log("[TTS] Finished speaking");
      setIsSpeaking(false);
      setIsPaused(false);
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      onEndRef.current?.();
    };

    utterance.onerror = (event) => {
      console.error("[TTS] Error:", event.error);
      setIsSpeaking(false);
      setIsPaused(false);
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = null;
      }
      
      // Ignore "interrupted" and "canceled" errors - these are expected
      if (event.error === "interrupted" || event.error === "canceled") {
        return;
      }
      
      onErrorRef.current?.("Could not play voice response. Please read the text.");
    };

    utteranceRef.current = utterance;

    // Speak
    synth.speak(utterance);
    console.log("[TTS] Queued speech, lang:", utterance.lang);

    // iOS fix: force resume if paused immediately
    setTimeout(() => {
      if (synth.paused) {
        synth.resume();
      }
    }, 100);
  }, [synth, defaultLanguage, rate, pitch, volume, findVoice, isPaused]);

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel();
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, [synth]);

  const pause = useCallback(() => {
    if (synth && isSpeaking) {
      synth.pause();
      setIsPaused(true);
    }
  }, [synth, isSpeaking]);

  const resume = useCallback(() => {
    if (synth && isPaused) {
      synth.resume();
      setIsPaused(false);
    }
  }, [synth, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
  };
}
