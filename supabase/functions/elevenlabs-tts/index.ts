import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Allowed origins for CORS - prevents unauthorized API usage
const ALLOWED_ORIGINS = [
  'https://7cd608d8-2528-4588-8caa-f9efbea178de.lovableproject.com',
  'https://id-preview--7cd608d8-2528-4588-8caa-f9efbea178de.lovable.app',
  'https://aarogyasri.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const AUTHENTICATED_RATE_LIMIT = 30; // 30 TTS requests per minute for authenticated users

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function checkRateLimit(key: string, limit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

// Voice mapping for Indian languages - ElevenLabs multilingual voices
const VOICE_MAP: Record<string, string> = {
  // Female voices that work well for Indian languages
  "hi-IN": "EXAVITQu4vr4xnSDxMaL", // Sarah - good for Hindi
  "te-IN": "14lx5SWXG46Ebq1PVnN6", // Custom Telugu voice
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

// Input validation limits
const MAX_TEXT_LENGTH = 5000;

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Authentication check - REQUIRED for TTS to protect API quota
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log("[ElevenLabs TTS] Unauthorized: No valid authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate JWT token
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[ElevenLabs TTS] Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the token by getting the user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user?.id) {
      console.log("[ElevenLabs TTS] Unauthorized: Invalid or expired token", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    console.log(`[ElevenLabs TTS] Authenticated user: ${userId}`);

    // Apply rate limiting per user
    const rateLimitKey = `tts:user:${userId}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, AUTHENTICATED_RATE_LIMIT);
    
    if (!rateLimitResult.allowed) {
      console.log(`[ElevenLabs TTS] Rate limit exceeded for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later.", 
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000) 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000))
          } 
        }
      );
    }

    console.log(`[ElevenLabs TTS] Rate limit check passed. Remaining: ${rateLimitResult.remaining}`);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      console.error("[ElevenLabs TTS] ELEVENLABS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TTS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, language = "en-IN" } = body as { text?: string; language?: string };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate language parameter
    if (typeof language !== 'string' || language.length > 10) {
      return new Response(
        JSON.stringify({ error: "Invalid language parameter" }),
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
    console.log(`[ElevenLabs TTS] Generated ${audioBuffer.byteLength} bytes of audio for user: ${userId}`);

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
