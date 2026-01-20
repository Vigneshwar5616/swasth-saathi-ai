import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language to voice mapping for best multilingual support
const languageVoiceMap: Record<string, { voiceId: string; name: string }> = {
  // Indian Languages - using multilingual voices that work well
  'hi': { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },      // Hindi
  'hi-IN': { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  'te': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },     // Telugu
  'te-IN': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  'ta': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },     // Tamil
  'ta-IN': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  'kn': { voiceId: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },   // Kannada
  'kn-IN': { voiceId: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  'ml': { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },     // Malayalam
  'ml-IN': { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  'bn': { voiceId: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },   // Bengali
  'bn-IN': { voiceId: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica' },
  'mr': { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },      // Marathi
  'mr-IN': { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },
  'gu': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },     // Gujarati
  'gu-IN': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  'pa': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },     // Punjabi
  'pa-IN': { voiceId: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  'or': { voiceId: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },   // Odia
  'or-IN': { voiceId: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda' },
  'as': { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },     // Assamese
  'as-IN': { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },
  
  // English
  'en': { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  'en-US': { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  'en-IN': { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  'en-GB': { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
  
  // Other common languages
  'es': { voiceId: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },    // Spanish
  'fr': { voiceId: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },     // French
  'de': { voiceId: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },     // German
  'pt': { voiceId: 'iP95p4xoKVk53GoZ742B', name: 'Chris' },     // Portuguese
  'zh': { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily' },      // Chinese
  'ja': { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice' },     // Japanese
  'ko': { voiceId: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },     // Korean
  'ar': { voiceId: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel' },    // Arabic
  'ru': { voiceId: 'nPczCjzI2devNBz1zQrb', name: 'Brian' },     // Russian
};

// Default voice for unsupported languages
const defaultVoice = { voiceId: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' };

function getVoiceForLanguage(language: string): { voiceId: string; name: string } {
  // Try exact match first
  if (languageVoiceMap[language]) {
    return languageVoiceMap[language];
  }
  
  // Try base language code (e.g., 'hi' from 'hi-IN')
  const baseLanguage = language.split('-')[0];
  if (languageVoiceMap[baseLanguage]) {
    return languageVoiceMap[baseLanguage];
  }
  
  return defaultVoice;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("[ElevenLabs TTS] API key not configured");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { text, language = 'en', voiceId: customVoiceId } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Limit text length to prevent abuse (ElevenLabs has a 5000 char limit)
    const trimmedText = text.slice(0, 5000);
    
    // Use custom voiceId if provided, otherwise use language-based selection
    const voiceInfo = customVoiceId 
      ? { voiceId: customVoiceId, name: 'Custom' }
      : getVoiceForLanguage(language);
    
    const { voiceId, name } = voiceInfo;
    
    console.log(`[ElevenLabs TTS] Generating audio for language: ${language}, voice: ${name} (${voiceId}), text length: ${trimmedText.length}${customVoiceId ? ' [CUSTOM VOICE]' : ''}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmedText,
          model_id: "eleven_multilingual_v2", // Best for multilingual support
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ElevenLabs TTS] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate audio", 
          details: errorText,
          status: response.status 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    
    console.log(`[ElevenLabs TTS] Audio generated successfully, size: ${audioBuffer.byteLength} bytes`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[ElevenLabs TTS] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
