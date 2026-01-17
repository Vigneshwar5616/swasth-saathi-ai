import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseElevenLabsScribeOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  languageCode?: string; // Optional language hint for better recognition
}

/**
 * Custom hook for ElevenLabs realtime speech-to-text transcription.
 * Uses WebSocket connection with VAD (Voice Activity Detection) for automatic segmentation.
 */
export function useElevenLabsScribe({
  onTranscript,
  onError,
  onStart,
  onEnd,
  languageCode,
}: UseElevenLabsScribeOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    setIsListening(false);
    setIsConnecting(false);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    onEnd?.();
  }, [cleanup, onEnd]);

  const start = useCallback(async () => {
    if (isListening || isConnecting) {
      stop();
      return;
    }

    setIsConnecting(true);

    try {
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      
      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to get speech token");
      }

      const token = data.token;

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Create WebSocket connection
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("ElevenLabs WebSocket connected");
        
        // Build configuration with optional language hint
        const config: Record<string, any> = {
          type: "configure",
          model_id: "scribe_v2_realtime",
          sample_rate: 16000,
          encoding: "pcm_s16le",
          commit_strategy: "vad", // Voice Activity Detection
        };
        
        // Add language hint if provided (helps with specific language recognition)
        // Note: scribe_v2_realtime auto-detects but this can improve accuracy
        if (languageCode) {
          // Convert to ISO 639-1/3 format (e.g., "hi-IN" -> "hi" or "hi-IN" -> "hin")
          const lang = languageCode.split("-")[0];
          config.language_code = lang;
          console.log("Setting language hint:", lang);
        }
        
        // Send initial configuration
        ws.send(JSON.stringify(config));

        // Start audio processing
        startAudioProcessing(stream, ws);
        setIsConnecting(false);
        setIsListening(true);
        onStart?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "partial_transcript" && data.text) {
            onTranscript(data.text, false);
          } else if (
            (data.type === "committed_transcript" || 
             data.type === "committed_transcript_with_timestamps") && 
            data.text
          ) {
            onTranscript(data.text, true);
          } else if (data.type === "error") {
            console.error("ElevenLabs error:", data);
            onError(data.message || "Transcription error");
            stop();
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        onError("Connection error. Please try again.");
        stop();
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        if (isListening) {
          stop();
        }
      };
    } catch (err: any) {
      console.error("Start error:", err);
      cleanup();
      
      if (err.name === "NotAllowedError") {
        onError("Microphone access denied. Please allow microphone access.");
      } else if (err.name === "NotFoundError") {
        onError("No microphone found. Please connect a microphone.");
      } else {
        onError(err.message || "Failed to start speech recognition");
      }
    }
  }, [isListening, isConnecting, cleanup, stop, onTranscript, onError, onStart]);

  const startAudioProcessing = (stream: MediaStream, ws: WebSocket) => {
    // Create audio context for processing
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Convert float32 to int16
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert to base64
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(pcmData.buffer))
      );

      // Send audio chunk
      ws.send(
        JSON.stringify({
          type: "audio",
          audio: base64,
        })
      );
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  return {
    isListening,
    isConnecting,
    start,
    stop,
  };
}
