import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indian voice IDs from ElevenLabs - natural sounding voices
const INDIAN_VOICES: Record<string, string> = {
  // Using voices that work well with Indian languages
  "en-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily - warm female voice
  "hi-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Hindi
  "te-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Telugu  
  "ta-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Tamil
  "kn-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Kannada
  "ml-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Malayalam
  "mr-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Marathi
  "bn-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Bengali
  "gu-IN": "pFZP5JQG7iQjIQuC4Bku", // Lily for Gujarati
  "default": "pFZP5JQG7iQjIQuC4Bku", // Lily as default
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, language } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select voice based on language
    const voiceId = INDIAN_VOICES[language] || INDIAN_VOICES["default"];
    
    console.log(`Generating TTS for language: ${language}, voice: ${voiceId}, text length: ${text.length}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.substring(0, 2500), // Limit text length
          model_id: "eleven_multilingual_v2", // Best for Indian languages
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.4,
            use_speaker_boost: true,
            speed: 0.95, // Slightly slower for clarity
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "TTS generation failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`TTS generated successfully, audio size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
