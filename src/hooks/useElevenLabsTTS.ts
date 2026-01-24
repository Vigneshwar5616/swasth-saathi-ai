import { useCallback, useRef, useState, useEffect } from "react";
import { getGlobalAudioContext } from "@/components/chat/AudioPermissionRequest";
import { supabase } from "@/integrations/supabase/client";
interface UseElevenLabsTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface AudioQueueItem {
  text: string;
  audioUrl?: string;
  audio?: HTMLAudioElement;
  status: "pending" | "loading" | "ready" | "playing" | "done" | "error";
}

interface UseElevenLabsTTSReturn {
  queueChunk: (text: string, language?: string) => void;
  finalize: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  reset: () => void;
}

// Larger chunks = fewer API calls (stay under ElevenLabs 5 concurrent limit)
const MIN_CHUNK_SIZE = 200;
const MAX_CHUNK_SIZE = 800;
// Max concurrent API requests (ElevenLabs limit is 5, we use 3 for safety)
const MAX_CONCURRENT_REQUESTS = 3;

// Detect iOS
const isIOS = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Create an iOS-compatible audio element with required attributes
 */
const createIOSCompatibleAudio = (url: string): HTMLAudioElement => {
  const audio = new Audio();
  
  // Critical iOS attributes
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  audio.preload = "auto";
  
  // Set crossOrigin for blob URLs isn't needed, but helps with other sources
  if (!url.startsWith("blob:")) {
    audio.crossOrigin = "anonymous";
  }
  
  audio.src = url;
  
  return audio;
};

/**
 * Unlock audio on iOS by playing a silent buffer
 * Must be called from a user gesture handler
 */
const unlockIOSAudio = async (): Promise<void> => {
  if (!isIOS()) return;
  
  try {
    // Try to use existing global AudioContext
    const audioCtx = getGlobalAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    
    // Also create a silent Audio element to unlock HTML5 audio
    const silentAudio = createIOSCompatibleAudio(
      "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYmZ3BCAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="
    );
    silentAudio.volume = 0.01;
    await silentAudio.play();
    silentAudio.pause();
    silentAudio.src = "";
  } catch (e) {
    console.log("[iOS] Audio unlock attempt:", e);
  }
};

/**
 * ElevenLabs TTS hook with streaming text support and rate limiting.
 * Includes iOS Safari audio playback fixes.
 */
export function useElevenLabsTTS({
  onStart,
  onEnd,
  onError,
}: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const queueRef = useRef<AudioQueueItem[]>([]);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isFinalizedRef = useRef(false);
  const pendingTextRef = useRef("");
  const languageRef = useRef("en-IN");
  const audioUrlsRef = useRef<string[]>([]);
  const activeRequestsRef = useRef(0);
  const pendingFetchesRef = useRef<number[]>([]); // Queue of indices waiting to fetch
  const iosUnlockedRef = useRef(false);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);

  // On iOS, pre-create an audio element that can be reused
  // This helps maintain the user gesture chain
  useEffect(() => {
    if (isIOS() && !preloadedAudioRef.current) {
      preloadedAudioRef.current = createIOSCompatibleAudio("");
    }
    
    return () => {
      if (preloadedAudioRef.current) {
        preloadedAudioRef.current.pause();
        preloadedAudioRef.current.src = "";
        preloadedAudioRef.current = null;
      }
    };
  }, []);

  const cleanupUrls = useCallback(() => {
    audioUrlsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    audioUrlsRef.current = [];
  }, []);

  // Process the fetch queue with rate limiting
  const processFetchQueue = useCallback(() => {
    while (
      activeRequestsRef.current < MAX_CONCURRENT_REQUESTS && 
      pendingFetchesRef.current.length > 0
    ) {
      const index = pendingFetchesRef.current.shift()!;
      const item = queueRef.current[index];
      if (item && item.status === "pending") {
        fetchAudioInternal(item.text, index);
      }
    }
  }, []);

  // Internal fetch with concurrency tracking
  const fetchAudioInternal = useCallback(async (text: string, index: number): Promise<void> => {
    const item = queueRef.current[index];
    if (!item) return;

    item.status = "loading";
    activeRequestsRef.current++;
    setIsLoading(true);

    try {
      // Get the user's actual session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Not authenticated - please log in to use voice features");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text, language: languageRef.current }),
        }
      );

      if (!response.ok) {
        // If rate limited, retry after delay
        if (response.status === 429) {
          console.warn(`[ElevenLabs] Rate limited on chunk ${index}, retrying in 2s...`);
          item.status = "pending";
          activeRequestsRef.current--;
          setTimeout(() => {
            pendingFetchesRef.current.unshift(index); // Add back to front of queue
            processFetchQueue();
          }, 2000);
          return;
        }
        throw new Error(`TTS failed: ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlsRef.current.push(audioUrl);

      // Create iOS-compatible audio element
      const audio = createIOSCompatibleAudio(audioUrl);
      
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          console.warn(`[ElevenLabs] Audio load timeout for chunk ${index}`);
          resolve(); // Resolve anyway, we'll try to play
        }, 5000);
        
        audio.oncanplaythrough = () => {
          clearTimeout(timeoutId);
          resolve();
        };
        audio.onerror = (e) => {
          clearTimeout(timeoutId);
          console.error(`[ElevenLabs] Audio load error for chunk ${index}:`, e);
          reject(new Error("Audio load failed"));
        };
        audio.load();
      });

      item.audioUrl = audioUrl;
      item.audio = audio;
      item.status = "ready";
      
      console.log(`[ElevenLabs] Chunk ${index} ready (${text.length} chars)`);
      
      playNext();
    } catch (error: any) {
      console.error(`[ElevenLabs] Chunk ${index} failed:`, error);
      item.status = "error";
      onError?.(error.message);
      currentIndexRef.current = Math.max(currentIndexRef.current, index + 1);
      playNext();
    } finally {
      activeRequestsRef.current--;
      const stillLoading = queueRef.current.some(i => i.status === "loading");
      setIsLoading(stillLoading || pendingFetchesRef.current.length > 0);
      // Process next item in fetch queue
      processFetchQueue();
    }
  }, [onError, processFetchQueue]);

  // Queue a fetch request (rate limited)
  const queueFetch = useCallback((text: string, index: number) => {
    pendingFetchesRef.current.push(index);
    processFetchQueue();
  }, [processFetchQueue]);

  const playNext = useCallback(() => {
    if (isPlayingRef.current) return;
    
    const currentIdx = currentIndexRef.current;
    const item = queueRef.current[currentIdx];
    
    if (!item) {
      if (isFinalizedRef.current && pendingFetchesRef.current.length === 0 && activeRequestsRef.current === 0) {
        setIsSpeaking(false);
        isPlayingRef.current = false;
        onEnd?.();
      }
      return;
    }

    if (item.status === "ready" && item.audio) {
      isPlayingRef.current = true;
      item.status = "playing";
      setIsSpeaking(true);

      if (currentIdx === 0) {
        onStart?.();
      }

      const audio = item.audio;

      audio.onended = () => {
        item.status = "done";
        isPlayingRef.current = false;
        currentIndexRef.current = currentIdx + 1;
        playNext();
      };

      audio.onerror = (e) => {
        console.error(`[ElevenLabs] Playback error for chunk ${currentIdx}:`, e);
        item.status = "error";
        isPlayingRef.current = false;
        currentIndexRef.current = currentIdx + 1;
        playNext();
      };

      // iOS-specific: ensure AudioContext is resumed
      const audioCtx = getGlobalAudioContext();
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }

      audio.play().catch(err => {
        console.error("[ElevenLabs] Play error:", err);
        
        // On iOS, if play fails, try one more time after a short delay
        if (isIOS()) {
          console.log("[ElevenLabs] iOS play failed, retrying...");
          setTimeout(() => {
            audio.play().catch(retryErr => {
              console.error("[ElevenLabs] iOS retry failed:", retryErr);
              item.status = "error";
              isPlayingRef.current = false;
              currentIndexRef.current = currentIdx + 1;
              onError?.("Audio playback blocked on iOS. Please tap the screen and try again.");
              playNext();
            });
          }, 100);
        } else {
          item.status = "error";
          isPlayingRef.current = false;
          currentIndexRef.current = currentIdx + 1;
          playNext();
        }
      });
    } else if (item.status === "error") {
      currentIndexRef.current = currentIdx + 1;
      playNext();
    }
  }, [onStart, onEnd, onError]);

  const queueChunk = useCallback((text: string, language: string = "en-IN") => {
    if (!text) return;
    
    // Unlock iOS audio on first chunk (this should be called from user gesture context)
    if (isIOS() && !iosUnlockedRef.current) {
      unlockIOSAudio();
      iosUnlockedRef.current = true;
    }
    
    languageRef.current = language;
    pendingTextRef.current += text;

    const pending = pendingTextRef.current;
    
    // Look for sentence boundaries (with larger minimum chunks)
    const sentenceEnders = /[.!?।॥]\s*/g;
    let lastEnd = 0;
    let match;
    
    while ((match = sentenceEnders.exec(pending)) !== null) {
      const endPos = match.index + match[0].length;
      const chunk = pending.slice(lastEnd, endPos).trim();
      
      // Only queue if we have enough text
      if (chunk.length >= MIN_CHUNK_SIZE) {
        const index = queueRef.current.length;
        queueRef.current.push({ text: chunk, status: "pending" });
        console.log(`[ElevenLabs] Queued chunk ${index}: "${chunk.slice(0, 40)}..." (${chunk.length} chars)`);
        queueFetch(chunk, index);
        lastEnd = endPos;
      }
    }
    
    pendingTextRef.current = pending.slice(lastEnd);
    
    // Force flush if buffer too large
    if (pendingTextRef.current.length > MAX_CHUNK_SIZE) {
      const chunk = pendingTextRef.current.trim();
      if (chunk) {
        const index = queueRef.current.length;
        queueRef.current.push({ text: chunk, status: "pending" });
        console.log(`[ElevenLabs] Force-queued chunk ${index}: "${chunk.slice(0, 40)}..." (${chunk.length} chars)`);
        queueFetch(chunk, index);
      }
      pendingTextRef.current = "";
    }
  }, [queueFetch]);

  const finalize = useCallback(() => {
    const remaining = pendingTextRef.current.trim();
    if (remaining && remaining.length > 10) {
      const index = queueRef.current.length;
      queueRef.current.push({ text: remaining, status: "pending" });
      console.log(`[ElevenLabs] Final chunk ${index}: "${remaining.slice(0, 40)}..." (${remaining.length} chars)`);
      queueFetch(remaining, index);
    }
    pendingTextRef.current = "";
    isFinalizedRef.current = true;
    
    if (queueRef.current.length === 0) {
      onEnd?.();
    }
  }, [queueFetch, onEnd]);

  const stop = useCallback(() => {
    queueRef.current.forEach(item => {
      if (item.audio) {
        item.audio.pause();
        item.audio.src = "";
      }
    });
    
    cleanupUrls();
    queueRef.current = [];
    currentIndexRef.current = 0;
    isPlayingRef.current = false;
    isFinalizedRef.current = false;
    pendingTextRef.current = "";
    activeRequestsRef.current = 0;
    pendingFetchesRef.current = [];
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanupUrls]);

  const reset = useCallback(() => {
    stop();
    iosUnlockedRef.current = false;
  }, [stop]);

  return {
    queueChunk,
    finalize,
    stop,
    reset,
    isSpeaking,
    isLoading,
  };
}
