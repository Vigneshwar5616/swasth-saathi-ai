import { useCallback, useRef, useState } from "react";

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

/**
 * ElevenLabs TTS hook with streaming text support and rate limiting.
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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

      const audio = new Audio(audioUrl);
      
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error("Audio load failed"));
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

      item.audio.onended = () => {
        item.status = "done";
        isPlayingRef.current = false;
        currentIndexRef.current = currentIdx + 1;
        playNext();
      };

      item.audio.onerror = () => {
        item.status = "error";
        isPlayingRef.current = false;
        currentIndexRef.current = currentIdx + 1;
        playNext();
      };

      item.audio.play().catch(err => {
        console.error("[ElevenLabs] Play error:", err);
        item.status = "error";
        isPlayingRef.current = false;
        currentIndexRef.current = currentIdx + 1;
        playNext();
      });
    } else if (item.status === "error") {
      currentIndexRef.current = currentIdx + 1;
      playNext();
    }
  }, [onStart, onEnd]);

  const queueChunk = useCallback((text: string, language: string = "en-IN") => {
    if (!text) return;
    
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
