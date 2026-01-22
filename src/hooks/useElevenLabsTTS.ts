import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseElevenLabsTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseElevenLabsTTSReturn {
  speak: (text: string, language?: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
}

/**
 * Hook for ElevenLabs Text-to-Speech with high-quality multilingual voices
 */
export function useElevenLabsTTS({
  onStart,
  onEnd,
  onError,
}: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanup]);

  const speak = useCallback(async (text: string, language: string = "en-IN") => {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Stop any current playback
    stop();
    setIsLoading(true);

    try {
      // Fetch audio from edge function using fetch (not supabase.functions.invoke)
      // because we need binary data, not JSON
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, language }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        cleanup();
        onEnd?.();
      };

      audio.onerror = (e) => {
        console.error("[ElevenLabs TTS] Audio playback error:", e);
        setIsSpeaking(false);
        setIsLoading(false);
        cleanup();
        onError?.("Failed to play audio");
      };

      await audio.play();
    } catch (error: any) {
      console.error("[ElevenLabs TTS] Error:", error);
      setIsLoading(false);
      setIsSpeaking(false);
      onError?.(error.message || "Failed to generate speech");
    }
  }, [stop, cleanup, onStart, onEnd, onError]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
  };
}
