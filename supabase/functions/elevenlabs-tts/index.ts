import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Clear Indian voice from ElevenLabs Voice Library - excellent multilingual support
const VOICE_ID = "Oq0cIHWGcnbOGozOQv0t";
const MODEL_ID = "eleven_multilingual_v2"; // Best for all Indian languages

// Language-specific optimizations for clarity
const getVoiceSettings = (langCode: string) => {
  // Base settings optimized for clear Indian language pronunciation
  const baseSettings = {
    stability: 0.80,        // High stability for consistent, clear pronunciation
    similarity_boost: 0.70, // Natural voice quality
    style: 0.05,            // Minimal style for maximum clarity
    use_speaker_boost: true,
    speed: 0.75,            // Slow and clear for all words to be understood
  };

  // Fine-tune for specific language families
  switch (langCode) {
    case "hi-IN": // Hindi
    case "mr-IN": // Marathi  
    case "ur-IN": // Urdu
      return { ...baseSettings, speed: 0.73, stability: 0.82 };
    
    case "bn-IN": // Bengali
    case "or-IN": // Odia
      return { ...baseSettings, speed: 0.72, stability: 0.83 };
    
    case "te-IN": // Telugu
    case "kn-IN": // Kannada
    case "ml-IN": // Malayalam
    case "ta-IN": // Tamil
      // Dravidian languages - slightly slower for complex syllables
      return { ...baseSettings, speed: 0.70, stability: 0.85 };
    
    case "gu-IN": // Gujarati
    case "pa-IN": // Punjabi
      return { ...baseSettings, speed: 0.73, stability: 0.82 };
    
    case "en-IN": // English (India)
    default:
      return { ...baseSettings, speed: 0.78, stability: 0.78 };
  }
};

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

    const langCode = language || "en-IN";
    console.log(`TTS request: lang=${langCode}, text length=${text.length}`);

    // Clean text for better pronunciation - preserve natural flow
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\n+/g, ". ") // Period + space for natural pauses between paragraphs
      .replace(/\s+/g, " ")
      .replace(/•/g, ",")
      .replace(/\[\d+\]/g, "") // Remove citation numbers like [1], [2]
      .replace(/\.{2,}/g, ".") // Multiple periods to single
      .replace(/\.\s*\./g, ".") // Clean up double periods
      .trim();

    // Limit to 4500 chars for complete responses
    const finalText = cleanText.substring(0, 4500);
    
    // Get language-optimized voice settings
    const voiceSettings = getVoiceSettings(langCode);

    if (!cleanText) {
      return new Response(
        JSON.stringify({ error: "No text to speak" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: finalText,
          model_id: MODEL_ID,
          voice_settings: voiceSettings,
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
