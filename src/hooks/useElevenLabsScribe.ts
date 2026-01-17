import { useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScribe, CommitStrategy } from "@elevenlabs/react";

interface UseElevenLabsScribeOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  languageCode?: string; // e.g. "hi-IN"
}

/**
 * Wrapper around ElevenLabs official `useScribe` hook.
 * This avoids manually managing the WebSocket protocol and fixes the "mic not listening" issue
 * caused by protocol mismatches.
 */
export function useElevenLabsScribe({
  onTranscript,
  onError,
  onStart,
  onEnd,
  languageCode,
}: UseElevenLabsScribeOptions) {
  const accumulatedRef = useRef<string>("");

  const elevenLanguageCode = useMemo(() => {
    // ElevenLabs expects ISO-639-1 or ISO-639-3 (often base language is fine)
    if (!languageCode) return undefined;
    return languageCode.split("-")[0];
  }, [languageCode]);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    languageCode: elevenLanguageCode,
    sampleRate: 16000,
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    onSessionStarted: () => {
      console.log("[Scribe] session_started");
      onStart?.();
    },
    onPartialTranscript: ({ text }) => {
      const display = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      onTranscript(display, false);
    },
    onCommittedTranscript: ({ text }) => {
      accumulatedRef.current = accumulatedRef.current
        ? `${accumulatedRef.current} ${text}`
        : text;
      onTranscript(accumulatedRef.current, true);
    },
    onError: (err) => {
      console.error("[Scribe] error", err);
      onError(
        err instanceof Error
          ? err.message
          : "Voice transcription error. Please try again."
      );
    },
    onConnect: () => console.log("[Scribe] connected"),
    onDisconnect: () => console.log("[Scribe] disconnected"),
  });

  const isListening = scribe.isConnected || scribe.isTranscribing;
  const isConnecting = scribe.status === "connecting";

  const start = useCallback(async () => {
    // Toggle behavior: if active, stop.
    if (scribe.isConnected || scribe.status === "connecting") {
      console.log("[Scribe] start() called while active; disconnecting");
      scribe.disconnect();
      onEnd?.();
      return;
    }

    accumulatedRef.current = "";

    try {
      console.log("[Scribe] Fetching token...");
      const { data, error } = await supabase.functions.invoke(
        "elevenlabs-scribe-token"
      );

      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get speech token");
      }

      console.log("[Scribe] Connecting...", {
        languageCode: elevenLanguageCode,
      });

      await scribe.connect({
        token: data.token,
        languageCode: elevenLanguageCode,
        commitStrategy: CommitStrategy.VAD,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        sampleRate: 16000,
      });
    } catch (e: unknown) {
      const err = e as Error & { name?: string };
      console.error("[Scribe] start() failed", err);

      if (err?.name === "NotAllowedError") {
        onError("Microphone access denied. Please allow microphone access.");
      } else if (err?.name === "NotFoundError") {
        onError("No microphone found. Please connect a microphone.");
      } else {
        onError(err?.message || "Failed to start voice transcription");
      }
    }
  }, [elevenLanguageCode, onEnd, onError, scribe]);

  const stop = useCallback(() => {
    if (scribe.isConnected || scribe.status === "connecting") {
      scribe.disconnect();
    }
    onEnd?.();
  }, [onEnd, scribe]);

  return {
    isListening,
    isConnecting,
    start,
    stop,
  };
}
