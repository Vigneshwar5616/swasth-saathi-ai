import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Voice selection - using voices that work well with Indian languages
// For authentic Indian accent, the multilingual model adapts based on text language
const VOICE_MAP: Record<string, string> = {
  // Indian English - use a clear, neutral voice that adapts well
  "en": "pFZP5JQG7iQjIQuC4Bku", // Lily - warm, clear, adapts well to accents
  "en-IN": "pFZP5JQG7iQjIQuC4Bku",
  
  // Hindi and other Indian languages - these work best with multilingual model
  "hi": "pFZP5JQG7iQjIQuC4Bku", // Lily
  "hi-IN": "pFZP5JQG7iQjIQuC4Bku",
  
  // South Indian languages
  "te": "pFZP5JQG7iQjIQuC4Bku", // Telugu
  "te-IN": "pFZP5JQG7iQjIQuC4Bku",
  "ta": "pFZP5JQG7iQjIQuC4Bku", // Tamil
  "ta-IN": "pFZP5JQG7iQjIQuC4Bku",
  "kn": "pFZP5JQG7iQjIQuC4Bku", // Kannada
  "kn-IN": "pFZP5JQG7iQjIQuC4Bku",
  "ml": "pFZP5JQG7iQjIQuC4Bku", // Malayalam
  "ml-IN": "pFZP5JQG7iQjIQuC4Bku",
  
  // Other Indian languages
  "mr": "pFZP5JQG7iQjIQuC4Bku", // Marathi
  "mr-IN": "pFZP5JQG7iQjIQuC4Bku",
  "bn": "pFZP5JQG7iQjIQuC4Bku", // Bengali
  "bn-IN": "pFZP5JQG7iQjIQuC4Bku",
  "gu": "pFZP5JQG7iQjIQuC4Bku", // Gujarati
  "gu-IN": "pFZP5JQG7iQjIQuC4Bku",
  "pa": "pFZP5JQG7iQjIQuC4Bku", // Punjabi
  "pa-IN": "pFZP5JQG7iQjIQuC4Bku",
};

const DEFAULT_VOICE = "pFZP5JQG7iQjIQuC4Bku"; // Lily

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
          model_id: "eleven_multilingual_v2", // Best for Indian languages - auto-adapts accent
          voice_settings: {
            stability: 0.5,        // Lower = more expressive, natural variation
            similarity_boost: 0.7, // Moderate to allow accent adaptation
            style: 0.6,           // Higher style for more character
            use_speaker_boost: true,
            speed: 0.95,          // Slightly slower for clarity
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
