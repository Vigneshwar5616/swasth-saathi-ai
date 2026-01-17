import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Professional multilingual voices
const VOICE_MAP: Record<string, string> = {
  // Indian English - professional female
  "en": "EXAVITQu4vr4xnSDxMaL", // Sarah - clear, professional
  "en-IN": "EXAVITQu4vr4xnSDxMaL",
  
  // Hindi - use multilingual voice
  "hi": "EXAVITQu4vr4xnSDxMaL", // Sarah works well for Hindi with multilingual model
  "hi-IN": "EXAVITQu4vr4xnSDxMaL",
  
  // Other Indian languages - use multilingual capable voice
  "te": "EXAVITQu4vr4xnSDxMaL", // Telugu
  "ta": "EXAVITQu4vr4xnSDxMaL", // Tamil
  "kn": "EXAVITQu4vr4xnSDxMaL", // Kannada
  "ml": "EXAVITQu4vr4xnSDxMaL", // Malayalam
  "mr": "EXAVITQu4vr4xnSDxMaL", // Marathi
  "bn": "EXAVITQu4vr4xnSDxMaL", // Bengali
  "gu": "EXAVITQu4vr4xnSDxMaL", // Gujarati
};

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();
    
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get voice for language
    const langBase = language?.split("-")[0] || "en";
    const voiceId = VOICE_MAP[language] || VOICE_MAP[langBase] || DEFAULT_VOICE;

    console.log(`TTS request: lang=${language}, voice=${voiceId}, text length=${text.length}`);

    // Clean text for better pronunciation
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/•/g, ",")
      .trim()
      .substring(0, 5000); // ElevenLabs limit

    if (!cleanText) {
      return new Response(
        JSON.stringify({ error: "No text to speak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2", // Supports 29 languages including Indian languages
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "TTS generation failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return audio as base64 for easier client handling
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = base64Encode(audioBuffer);

    return new Response(
      JSON.stringify({ audio: audioBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
