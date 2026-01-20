import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseElevenLabsTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseElevenLabsTTSReturn {
  speak: (text: string, language: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useElevenLabsTTS({
  onStart,
  onEnd,
  onError,
}: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Stop and cleanup audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Revoke the object URL to free memory
      if (audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(async (text: string, language: string) => {
    if (!text || !text.trim()) {
      console.log("[ElevenLabs TTS] No text to speak");
      return;
    }

    // Stop any current playback
    stop();

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[ElevenLabs TTS] Generating audio for language: ${language}, text length: ${text.length}`);

      // Get auth session for the request
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: text.slice(0, 5000), // Limit text length
            language 
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS request failed: ${response.status}`);
      }

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and configure audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadeddata = () => {
        console.log("[ElevenLabs TTS] Audio loaded, duration:", audio.duration);
      };

      audio.onplay = () => {
        console.log("[ElevenLabs TTS] Started playing");
        setIsSpeaking(true);
        setIsLoading(false);
        onStart?.();
      };

      audio.onended = () => {
        console.log("[ElevenLabs TTS] Finished playing");
        setIsSpeaking(false);
        // Cleanup
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        onEnd?.();
      };

      audio.onerror = (e) => {
        console.error("[ElevenLabs TTS] Audio playback error:", e);
        setIsSpeaking(false);
        setIsLoading(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        const errorMsg = "Failed to play audio";
        setError(errorMsg);
        onError?.(errorMsg);
      };

      // Start playback
      await audio.play();

    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log("[ElevenLabs TTS] Request aborted");
        return;
      }

      console.error("[ElevenLabs TTS] Error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to generate audio";
      setError(errorMsg);
      setIsLoading(false);
      onError?.(errorMsg);
    }
  }, [stop, onStart, onEnd, onError]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
  };
}
