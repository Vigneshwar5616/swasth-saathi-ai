import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS - prevents unauthorized API usage
const ALLOWED_ORIGINS = [
  'https://7cd608d8-2528-4588-8caa-f9efbea178de.lovableproject.com',
  'https://id-preview--7cd608d8-2528-4588-8caa-f9efbea178de.lovable.app',
  'https://aarogyasri.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Voice mapping for Indian languages - ElevenLabs multilingual voices
const VOICE_MAP: Record<string, string> = {
  // Female voices that work well for Indian languages
  "hi-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah - good for Hindi
  "te-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "ta-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "kn-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "ml-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "mr-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "bn-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "gu-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "pa-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "or-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "ur-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "en-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah - for English with Indian accent
  "en-US": "EXAVITQu4vr4xnSDxMaL", // Sarah
  "en": "EXAVITQu4vr4xnSDxMaL",    // Sarah - default
};

// Get ElevenLabs language code from app language code
const getElevenLabsLanguage = (langCode: string): string => {
  const langMap: Record<string, string> = {
    "hi-IN": "hi",
    "te-IN": "te", 
    "ta-IN": "ta",
    "kn-IN": "kn",
    "ml-IN": "ml",
    "mr-IN": "mr",
    "bn-IN": "bn",
    "gu-IN": "gu",
    "pa-IN": "pa",
    "or-IN": "or",
    "ur-IN": "ur",
    "en-IN": "en",
    "en-US": "en",
    "en": "en",
  };
  return langMap[langCode] || "en";
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, language = "en-IN" } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean and limit text (ElevenLabs has limits)
    const cleanText = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "") // Remove markdown italic
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\[\d+\]/g, "") // Remove citation numbers
      .trim()
      .slice(0, 4500); // ElevenLabs limit is ~5000 chars

    const voiceId = VOICE_MAP[language] || VOICE_MAP["en"];
    const elevenLabsLang = getElevenLabsLanguage(language);

    console.log(`[ElevenLabs TTS] Generating speech for ${language} (${elevenLabsLang}), voice: ${voiceId}, text length: ${cleanText.length}`);

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
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 0.9, // Slightly slower for clarity
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs TTS] API error: ${response.status}`, errorText);
      return new Response(
        JSON.stringify({ error: `TTS generation failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[ElevenLabs TTS] Generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("[ElevenLabs TTS] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
