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
  /** Queue a text chunk to be spoken */
  queueChunk: (text: string, language?: string) => void;
  /** Finalize the queue - no more chunks coming */
  finalize: () => void;
  /** Stop all audio and clear queue */
  stop: () => void;
  /** Whether any audio is currently playing */
  isSpeaking: boolean;
  /** Whether audio is being loaded */
  isLoading: boolean;
  /** Reset for a new conversation */
  reset: () => void;
}

// Minimum characters to queue (to avoid too many small requests)
const MIN_CHUNK_SIZE = 80;
// Maximum characters per chunk
const MAX_CHUNK_SIZE = 500;

/**
 * ElevenLabs TTS hook with streaming text support.
 * Queues text chunks and plays them sequentially for low latency.
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

  // Cleanup function for audio URLs
  const cleanupUrls = useCallback(() => {
    audioUrlsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    audioUrlsRef.current = [];
  }, []);

  // Fetch audio for a text chunk
  const fetchAudio = useCallback(async (text: string, index: number): Promise<void> => {
    const item = queueRef.current[index];
    if (!item || item.status !== "pending") return;

    item.status = "loading";
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
        throw new Error(`TTS failed: ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlsRef.current.push(audioUrl);

      const audio = new Audio(audioUrl);
      
      // Preload the audio
      await new Promise<void>((resolve, reject) => {
        audio.oncanplaythrough = () => resolve();
        audio.onerror = () => reject(new Error("Audio load failed"));
        audio.load();
      });

      item.audioUrl = audioUrl;
      item.audio = audio;
      item.status = "ready";
      
      console.log(`[ElevenLabs] Chunk ${index} ready (${text.length} chars)`);
      
      // Try to play if this is next in queue
      playNext();
    } catch (error: any) {
      console.error(`[ElevenLabs] Chunk ${index} failed:`, error);
      item.status = "error";
      onError?.(error.message);
      // Skip to next chunk
      currentIndexRef.current = index + 1;
      playNext();
    } finally {
      // Check if still loading any chunks
      const stillLoading = queueRef.current.some(i => i.status === "loading");
      setIsLoading(stillLoading);
    }
  }, [onError]);

  // Play the next ready audio in queue
  const playNext = useCallback(() => {
    if (isPlayingRef.current) return;
    
    const currentIdx = currentIndexRef.current;
    const item = queueRef.current[currentIdx];
    
    if (!item) {
      // No more items
      if (isFinalizedRef.current) {
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
      // Skip errored items
      currentIndexRef.current = currentIdx + 1;
      playNext();
    }
    // If still loading/pending, wait for it to become ready
  }, [onStart, onEnd]);

  // Add text to pending buffer and flush when we have enough
  const queueChunk = useCallback((text: string, language: string = "en-IN") => {
    if (!text) return;
    
    languageRef.current = language;
    pendingTextRef.current += text;

    // Check if we have a complete sentence or enough text
    const pending = pendingTextRef.current;
    
    // Look for sentence boundaries
    const sentenceEnders = /[.!?।॥]\s*/g;
    let lastEnd = 0;
    let match;
    
    while ((match = sentenceEnders.exec(pending)) !== null) {
      const endPos = match.index + match[0].length;
      const chunk = pending.slice(lastEnd, endPos).trim();
      
      if (chunk.length >= MIN_CHUNK_SIZE || (lastEnd > 0 && chunk.length > 20)) {
        // Queue this chunk
        const index = queueRef.current.length;
        queueRef.current.push({ text: chunk, status: "pending" });
        console.log(`[ElevenLabs] Queued chunk ${index}: "${chunk.slice(0, 50)}..." (${chunk.length} chars)`);
        fetchAudio(chunk, index);
        lastEnd = endPos;
      }
    }
    
    // Keep remaining text in buffer
    pendingTextRef.current = pending.slice(lastEnd);
    
    // If buffer is getting too large, force flush
    if (pendingTextRef.current.length > MAX_CHUNK_SIZE) {
      const chunk = pendingTextRef.current.trim();
      if (chunk) {
        const index = queueRef.current.length;
        queueRef.current.push({ text: chunk, status: "pending" });
        console.log(`[ElevenLabs] Force-queued chunk ${index}: "${chunk.slice(0, 50)}..." (${chunk.length} chars)`);
        fetchAudio(chunk, index);
      }
      pendingTextRef.current = "";
    }
  }, [fetchAudio]);

  // Finalize - flush remaining text and mark queue as complete
  const finalize = useCallback(() => {
    const remaining = pendingTextRef.current.trim();
    if (remaining && remaining.length > 10) {
      const index = queueRef.current.length;
      queueRef.current.push({ text: remaining, status: "pending" });
      console.log(`[ElevenLabs] Final chunk ${index}: "${remaining.slice(0, 50)}..." (${remaining.length} chars)`);
      fetchAudio(remaining, index);
    }
    pendingTextRef.current = "";
    isFinalizedRef.current = true;
    
    // Check if we're already done
    if (queueRef.current.length === 0 || currentIndexRef.current >= queueRef.current.length) {
      setIsSpeaking(false);
      onEnd?.();
    }
  }, [fetchAudio, onEnd]);

  // Stop all audio
  const stop = useCallback(() => {
    // Stop current audio
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
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanupUrls]);

  // Reset for new conversation
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
