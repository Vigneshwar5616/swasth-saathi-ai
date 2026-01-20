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
// Each entry lists fallbacks in priority order
const LANGUAGE_FALLBACKS: Record<string, string[]> = {
  "hi-IN": ["hi", "hi-IN"],
  "bn-IN": ["bn", "bn-IN"],
  "te-IN": ["te", "te-IN"],
  "mr-IN": ["mr", "mr-IN"],
  "ta-IN": ["ta", "ta-IN"],
  "gu-IN": ["gu", "gu-IN"],
  "ur-IN": ["ur", "ur-IN"],
  "kn-IN": ["kn", "kn-IN"],
  "ml-IN": ["ml", "ml-IN"],
  "pa-IN": ["pa", "pa-IN"],
  "or-IN": ["or", "or-IN"],
  "en-IN": ["en-IN", "en-GB", "en-US", "en"],
};

// Languages that are considered "same family" (no fallback notification needed)
const SAME_FAMILY_MAP: Record<string, string[]> = {
  "hi-IN": ["hi", "hi-IN"],
  "bn-IN": ["bn", "bn-IN"],
  "te-IN": ["te", "te-IN"],
  "mr-IN": ["mr", "mr-IN"],
  "ta-IN": ["ta", "ta-IN"],
  "gu-IN": ["gu", "gu-IN"],
  "ur-IN": ["ur", "ur-IN"],
  "kn-IN": ["kn", "kn-IN"],
  "ml-IN": ["ml", "ml-IN"],
  "pa-IN": ["pa", "pa-IN"],
  "or-IN": ["or", "or-IN"],
  "en-IN": ["en-IN", "en-GB", "en-US", "en"],
  "en": ["en-IN", "en-GB", "en-US", "en"],
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

  // Check if two languages are in the same family (no fallback notification needed)
  const isSameLanguageFamily = useCallback((requestedLang: string, actualLang: string): boolean => {
    const requestedBase = requestedLang.split("-")[0].toLowerCase();
    const actualBase = actualLang.split("-")[0].toLowerCase();
    
    // Same base language = same family
    if (requestedBase === actualBase) return true;
    
    // Check the explicit same-family map
    const family = SAME_FAMILY_MAP[requestedLang];
    if (family && family.some(l => l.toLowerCase() === actualLang.toLowerCase() || l.split("-")[0].toLowerCase() === actualBase)) {
      return true;
    }
    
    return false;
  }, []);

  // Find the best voice for a language with fallback support
  const findVoice = useCallback((lang: string): { voice: SpeechSynthesisVoice | null; actualLang: string; isSameFamily: boolean } => {
    if (voices.length === 0) return { voice: null, actualLang: lang, isSameFamily: true };

    const langBase = lang.split("-")[0].toLowerCase();
    
    // First, try to find a direct match for the requested language
    const directMatches = voices.filter(v => {
      const vLang = v.lang.toLowerCase();
      const vBase = vLang.split("-")[0];
      return vLang === lang.toLowerCase() || vBase === langBase;
    });
    
    if (directMatches.length > 0) {
      // Score and pick the best direct match
      const scoredDirect = directMatches
        .map(v => ({ voice: v, score: scoreVoice(v, lang) }))
        .sort((a, b) => b.score - a.score);
      
      const bestVoice = scoredDirect[0].voice;
      console.log(`[TTS] Direct match for ${lang}: ${bestVoice.name} (${bestVoice.lang})`);
      return { voice: bestVoice, actualLang: bestVoice.lang, isSameFamily: true };
    }
    
    // No direct match - try fallback chain
    const fallbackChain = LANGUAGE_FALLBACKS[lang] || [];
    const fullFallbackChain = [...fallbackChain, "en-IN", "en-US", "en"];
    
    for (const tryLang of fullFallbackChain) {
      const tryBase = tryLang.split("-")[0].toLowerCase();
      
      const fallbackMatches = voices.filter(v => {
        const vLang = v.lang.toLowerCase();
        const vBase = vLang.split("-")[0];
        return vLang === tryLang.toLowerCase() || vBase === tryBase;
      });
      
      if (fallbackMatches.length > 0) {
        const scoredFallback = fallbackMatches
          .map(v => ({ voice: v, score: scoreVoice(v, tryLang) }))
          .sort((a, b) => b.score - a.score);
        
        const bestVoice = scoredFallback[0].voice;
        const sameFamily = isSameLanguageFamily(lang, tryLang);
        
        console.log(`[TTS] Fallback for ${lang} -> ${tryLang}: ${bestVoice.name} (${bestVoice.lang}), sameFamily: ${sameFamily}`);
        return { voice: bestVoice, actualLang: tryLang, isSameFamily: sameFamily };
      }
    }

    // Last resort: use default voice
    const defaultVoice = voices.find(v => v.default) || voices[0];
    console.log(`[TTS] No suitable voice for ${lang}, using default: ${defaultVoice?.name}`);
    return { voice: defaultVoice || null, actualLang: "en", isSameFamily: false };
  }, [voices, scoreVoice, isSameLanguageFamily]);

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
    const { voice, actualLang, isSameFamily } = findVoice(targetLang);
    
    // Only notify about fallback if using a DIFFERENT language family
    // (e.g., Hindi -> English, not hi-IN -> hi)
    if (!isSameFamily && actualLang !== targetLang && onFallbackRef.current) {
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
