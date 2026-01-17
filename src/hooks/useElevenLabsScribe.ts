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
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const accumulatedTextRef = useRef<string>("");

  const cleanup = useCallback(() => {
    console.log("[Scribe] Cleaning up resources...");
    
    // Disconnect audio processor
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceRef.current = null;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("[Scribe] Stopped track:", track.kind);
      });
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
        console.log("[Scribe] Audio context closed");
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
        console.log("[Scribe] WebSocket closed");
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    // Reset accumulated text
    accumulatedTextRef.current = "";
    
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

    console.log("[Scribe] Starting transcription...");
    setIsConnecting(true);
    accumulatedTextRef.current = "";

    try {
      // Get token from edge function
      console.log("[Scribe] Fetching token...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      
      if (error || !data?.token) {
        console.error("[Scribe] Token error:", error);
        throw new Error(error?.message || "Failed to get speech token");
      }

      console.log("[Scribe] Token received, requesting microphone...");

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      console.log("[Scribe] Microphone access granted");

      // Create WebSocket connection
      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?token=${data.token}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Scribe] WebSocket connected");
        
        // Build configuration with optional language hint
        const config: Record<string, unknown> = {
          type: "configure",
          model_id: "scribe_v2_realtime",
          sample_rate: 16000,
          encoding: "pcm_s16le",
          commit_strategy: "vad", // Voice Activity Detection
        };
        
        // Add language hint if provided
        if (languageCode) {
          const lang = languageCode.split("-")[0];
          config.language_code = lang;
          console.log("[Scribe] Setting language hint:", lang);
        }
        
        // Send initial configuration
        ws.send(JSON.stringify(config));
        console.log("[Scribe] Sent config:", config);

        // Start audio processing
        startAudioProcessing(stream, ws);
        setIsConnecting(false);
        setIsListening(true);
        onStart?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("[Scribe] Received:", msg.type, msg.text?.substring(0, 50) || "");
          
          if (msg.type === "partial_transcript" && msg.text) {
            // For partials, show current partial + accumulated
            const displayText = accumulatedTextRef.current 
              ? accumulatedTextRef.current + " " + msg.text 
              : msg.text;
            onTranscript(displayText, false);
          } else if (
            (msg.type === "committed_transcript" || 
             msg.type === "committed_transcript_with_timestamps") && 
            msg.text
          ) {
            // Accumulate committed text
            accumulatedTextRef.current = accumulatedTextRef.current 
              ? accumulatedTextRef.current + " " + msg.text 
              : msg.text;
            onTranscript(accumulatedTextRef.current, true);
            console.log("[Scribe] Committed:", accumulatedTextRef.current);
          } else if (msg.type === "error") {
            console.error("[Scribe] Error:", msg);
            onError(msg.message || "Transcription error");
            stop();
          } else if (msg.type === "session_started") {
            console.log("[Scribe] Session started successfully");
          }
        } catch (e) {
          console.error("[Scribe] Parse error:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("[Scribe] WebSocket error:", event);
        onError("Connection error. Please try again.");
        stop();
      };

      ws.onclose = (event) => {
        console.log("[Scribe] WebSocket closed:", event.code, event.reason);
        if (isListening) {
          stop();
        }
      };
    } catch (err: unknown) {
      const error = err as Error & { name?: string };
      console.error("[Scribe] Start error:", error);
      cleanup();
      
      if (error.name === "NotAllowedError") {
        onError("Microphone access denied. Please allow microphone access.");
      } else if (error.name === "NotFoundError") {
        onError("No microphone found. Please connect a microphone.");
      } else {
        onError(error.message || "Failed to start speech recognition");
      }
    }
  }, [isListening, isConnecting, cleanup, stop, onTranscript, onError, onStart, languageCode]);

  const startAudioProcessing = (stream: MediaStream, ws: WebSocket) => {
    console.log("[Scribe] Starting audio processing...");
    
    // Create audio context - use device's sample rate, we'll handle conversion
    const audioContext = new AudioContext({ sampleRate: 16000 });
    audioContextRef.current = audioContext;
    
    console.log("[Scribe] AudioContext state:", audioContext.state, "sampleRate:", audioContext.sampleRate);

    // Resume audio context if suspended (required on some browsers)
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        console.log("[Scribe] AudioContext resumed");
      });
    }

    const source = audioContext.createMediaStreamSource(stream);
    sourceRef.current = source;
    
    // Use ScriptProcessor for audio processing (deprecated but widely supported)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;
    
    let chunkCount = 0;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Check if there's any audio data
      let maxAmplitude = 0;
      for (let i = 0; i < inputData.length; i++) {
        const absVal = Math.abs(inputData[i]);
        if (absVal > maxAmplitude) maxAmplitude = absVal;
      }
      
      // Log occasionally to show audio is flowing
      chunkCount++;
      if (chunkCount % 50 === 0) {
        console.log("[Scribe] Audio chunk", chunkCount, "max amplitude:", maxAmplitude.toFixed(4));
      }
      
      // Skip if no meaningful audio (silence threshold)
      if (maxAmplitude < 0.001) return;
      
      // Convert float32 to int16
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert to base64 - use chunked approach to avoid stack overflow
      const bytes = new Uint8Array(pcmData.buffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64 = btoa(binary);

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
    console.log("[Scribe] Audio pipeline connected");
  };

  return {
    isListening,
    isConnecting,
    start,
    stop,
  };
}
