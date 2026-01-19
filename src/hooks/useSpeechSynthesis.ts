import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechSynthesisOptions {
  defaultLanguage?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onFallback?: (fromLang: string, toLang: string) => void;
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
  availableLanguages: string[];
}

// Language-specific TTS settings for optimal pronunciation
const LANGUAGE_SETTINGS: Record<string, { rate: number; pitch: number; name: string }> = {
  // Indo-Aryan languages
  "hi-IN": { rate: 0.85, pitch: 1.0, name: "Hindi" },
  "bn-IN": { rate: 0.82, pitch: 1.0, name: "Bengali" },
  "mr-IN": { rate: 0.85, pitch: 1.0, name: "Marathi" },
  "gu-IN": { rate: 0.85, pitch: 1.0, name: "Gujarati" },
  "pa-IN": { rate: 0.85, pitch: 1.0, name: "Punjabi" },
  "or-IN": { rate: 0.82, pitch: 1.0, name: "Odia" },
  "ur-IN": { rate: 0.82, pitch: 1.0, name: "Urdu" },
  
  // Dravidian languages - slightly slower for complex syllables
  "ta-IN": { rate: 0.78, pitch: 1.0, name: "Tamil" },
  "te-IN": { rate: 0.78, pitch: 1.0, name: "Telugu" },
  "kn-IN": { rate: 0.78, pitch: 1.0, name: "Kannada" },
  "ml-IN": { rate: 0.75, pitch: 1.0, name: "Malayalam" },
  
  // English variants
  "en-IN": { rate: 0.9, pitch: 1.0, name: "English (India)" },
  "en-US": { rate: 0.95, pitch: 1.0, name: "English (US)" },
  "en-GB": { rate: 0.92, pitch: 1.0, name: "English (UK)" },
};

// Fallback chain for languages - try related languages when native not available
const LANGUAGE_FALLBACKS: Record<string, string[]> = {
  "hi-IN": ["hi", "en-IN", "en"],
  "bn-IN": ["bn", "hi-IN", "en-IN", "en"],
  "te-IN": ["te", "hi-IN", "en-IN", "en"],
  "mr-IN": ["mr", "hi-IN", "en-IN", "en"],
  "ta-IN": ["ta", "hi-IN", "en-IN", "en"],
  "gu-IN": ["gu", "hi-IN", "en-IN", "en"],
  "ur-IN": ["ur", "hi-IN", "en-IN", "en"],
  "kn-IN": ["kn", "hi-IN", "en-IN", "en"],
  "ml-IN": ["ml", "hi-IN", "en-IN", "en"],
  "pa-IN": ["pa", "hi-IN", "en-IN", "en"],
  "or-IN": ["or", "hi-IN", "en-IN", "en"],
  "en-IN": ["en-IN", "en-GB", "en-US", "en"],
};

/**
 * Enhanced Text-to-Speech hook with improved Indian language support.
 * Features:
 * - Language-specific rate/pitch optimization
 * - Smart voice selection prioritizing Google/Microsoft voices
 * - Fallback to related languages when native voice unavailable
 * - iOS quirks handling and keep-alive
 */
export function useSpeechSynthesis({
  defaultLanguage = "en-IN",
  rate,
  pitch,
  volume = 1.0,
  onStart,
  onEnd,
  onError,
  onFallback,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onFallbackRef = useRef(onFallback);
  
  // Keep iOS speech synthesis alive - it pauses when tab loses focus
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  const isSupported = !!synth && typeof synth.speak === "function";

  // Update refs when callbacks change
  useEffect(() => {
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
    onFallbackRef.current = onFallback;
  }, [onStart, onEnd, onError, onFallback]);

  // Load voices and determine available languages
  useEffect(() => {
    if (!synth) return;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        
        // Extract unique language codes
        const langs = [...new Set(availableVoices.map(v => v.lang))];
        setAvailableLanguages(langs);
        
        console.log("[TTS] Loaded voices:", availableVoices.length, "Languages:", langs.length);
        
        // Log available Indian language voices for debugging
        const indianVoices = availableVoices.filter(v => 
          v.lang.includes("-IN") || 
          ["hi", "bn", "te", "ta", "mr", "gu", "kn", "ml", "pa", "or", "ur"].some(l => v.lang.startsWith(l))
        );
        if (indianVoices.length > 0) {
          console.log("[TTS] Indian language voices:", indianVoices.map(v => `${v.name} (${v.lang})`));
        }
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

  // Score a voice for a given language (higher is better)
  const scoreVoice = useCallback((voice: SpeechSynthesisVoice, targetLang: string): number => {
    let score = 0;
    const voiceLang = voice.lang.toLowerCase();
    const target = targetLang.toLowerCase();
    const targetBase = target.split("-")[0];
    
    // Exact language match
    if (voiceLang === target) score += 100;
    // Base language match (e.g., "hi" matches "hi-IN")
    else if (voiceLang.startsWith(targetBase)) score += 80;
    else if (voiceLang.split("-")[0] === targetBase) score += 70;
    
    // Prefer Google voices (best quality for Indian languages)
    if (voice.name.toLowerCase().includes("google")) score += 50;
    // Microsoft voices are also good
    else if (voice.name.toLowerCase().includes("microsoft")) score += 40;
    // Apple voices
    else if (voice.name.toLowerCase().includes("siri") || voice.name.toLowerCase().includes("apple")) score += 30;
    
    // Prefer local voices over network voices (faster)
    if (voice.localService) score += 10;
    
    // Prefer default voice as a tiebreaker
    if (voice.default) score += 5;
    
    // Prefer voices with the region (e.g., "IN" for India)
    if (voiceLang.includes("-in") && target.includes("-in")) score += 15;
    
    return score;
  }, []);

  // Find the best voice for a language with fallback support
  const findVoice = useCallback((lang: string): { voice: SpeechSynthesisVoice | null; actualLang: string } => {
    if (voices.length === 0) return { voice: null, actualLang: lang };

    const fallbackChain = LANGUAGE_FALLBACKS[lang] || [lang.split("-")[0], "en-IN", "en"];
    
    for (const tryLang of [lang, ...fallbackChain]) {
      // Score all voices for this language
      const scoredVoices = voices
        .map(v => ({ voice: v, score: scoreVoice(v, tryLang) }))
        .filter(({ score }) => score >= 70) // Only consider reasonable matches
        .sort((a, b) => b.score - a.score);
      
      if (scoredVoices.length > 0) {
        const bestVoice = scoredVoices[0].voice;
        const usedFallback = tryLang !== lang;
        
        if (usedFallback) {
          console.log(`[TTS] Using fallback: ${lang} -> ${tryLang} (${bestVoice.name})`);
        }
        
        return { voice: bestVoice, actualLang: tryLang };
      }
    }

    // Last resort: use default voice
    const defaultVoice = voices.find(v => v.default) || voices[0];
    console.log(`[TTS] No suitable voice for ${lang}, using default: ${defaultVoice?.name}`);
    return { voice: defaultVoice || null, actualLang: "en" };
  }, [voices, scoreVoice]);

  // Get language-specific settings
  const getLanguageSettings = useCallback((lang: string) => {
    const settings = LANGUAGE_SETTINGS[lang];
    if (settings) {
      return {
        rate: rate ?? settings.rate,
        pitch: pitch ?? settings.pitch,
      };
    }
    
    // Default settings for unknown languages
    return {
      rate: rate ?? 0.85,
      pitch: pitch ?? 1.0,
    };
  }, [rate, pitch]);

  // Clean text for better pronunciation in different languages
  const cleanTextForLanguage = useCallback((text: string, lang: string): string => {
    let cleaned = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "") // Remove markdown italic
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\[\d+\]/g, "") // Remove citation numbers
      .replace(/\.{2,}/g, ".") // Multiple periods to single
      .replace(/\.\s*\./g, ".") // Clean double periods
      .trim();

    // Language-specific processing
    const langBase = lang.split("-")[0];
    
    if (langBase === "en") {
      // English: standard processing
      cleaned = cleaned
        .replace(/\n+/g, ". ")
        .replace(/\s+/g, " ")
        .replace(/•/g, ",");
    } else {
      // Indian languages: preserve natural pauses better
      cleaned = cleaned
        .replace(/\n+/g, "। ") // Use Devanagari danda for pause
        .replace(/\s+/g, " ")
        .replace(/•/g, "،") // Use proper punctuation
        // Add slight pauses for better comprehension
        .replace(/([।॥?!])\s*/g, "$1  "); // Extra space after sentence endings
    }

    // For Dravidian languages, add extra pauses between sentences
    if (["ta", "te", "kn", "ml"].includes(langBase)) {
      cleaned = cleaned
        .replace(/\.\s+/g, ".   ") // Extra pause between sentences
        .replace(/,\s+/g, ",  "); // Extra pause at commas
    }

    return cleaned;
  }, []);

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

    const targetLang = language || defaultLanguage;
    
    // Clean up the text based on language
    const cleanText = cleanTextForLanguage(text, targetLang);

    if (!cleanText) {
      console.log("[TTS] No clean text to speak");
      return;
    }

    // Find the best voice
    const { voice, actualLang } = findVoice(targetLang);
    
    // Notify about fallback if different language is used
    if (actualLang !== targetLang && onFallbackRef.current) {
      const fromName = LANGUAGE_SETTINGS[targetLang]?.name || targetLang;
      const toName = LANGUAGE_SETTINGS[actualLang]?.name || actualLang;
      onFallbackRef.current(fromName, toName);
    }

    // Get language-specific settings
    const langSettings = getLanguageSettings(actualLang);

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = actualLang;
    utterance.rate = langSettings.rate;
    utterance.pitch = langSettings.pitch;
    utterance.volume = volume;

    if (voice) {
      utterance.voice = voice;
      console.log(`[TTS] Speaking in ${LANGUAGE_SETTINGS[actualLang]?.name || actualLang}`, {
        voice: voice.name,
        lang: voice.lang,
        rate: langSettings.rate,
        textLength: cleanText.length,
      });
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
    console.log("[TTS] Queued speech, target:", targetLang, "actual:", actualLang);

    // iOS fix: force resume if paused immediately
    setTimeout(() => {
      if (synth.paused) {
        synth.resume();
      }
    }, 100);
  }, [synth, defaultLanguage, volume, findVoice, getLanguageSettings, cleanTextForLanguage, isPaused]);

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
    availableLanguages,
  };
}
