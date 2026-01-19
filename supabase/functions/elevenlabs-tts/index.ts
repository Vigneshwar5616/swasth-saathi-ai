import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://7cd608d8-2528-4588-8caa-f9efbea178de.lovableproject.com',
  'https://id-preview--7cd608d8-2528-4588-8caa-f9efbea178de.lovable.app',
  'https://aarogyasri.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT = 30; // 30 requests per minute

// In-memory rate limit store (resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `user:${userId}`;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt };
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetAt: record.resetAt };
}

// Input validation
const MAX_TEXT_LENGTH = 5000;
const MIN_TEXT_LENGTH = 1;

function validateText(text: unknown): { valid: boolean; text?: string; error?: string } {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text is required and must be a string' };
  }
  
  const trimmedText = text.trim();
  
  if (trimmedText.length < MIN_TEXT_LENGTH) {
    return { valid: false, error: 'Text cannot be empty' };
  }
  
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return { valid: false, error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
  }
  
  return { valid: true, text: trimmedText };
}

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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Authentication check - REQUIRED
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("Auth validation failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user for TTS:", userId);

    // Rate limiting
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user:${userId}`);
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded",
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

    // Parse request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, language } = body as Record<string, unknown>;
    
    // Validate text input
    const textValidation = validateText(text);
    if (!textValidation.valid) {
      return new Response(
        JSON.stringify({ error: textValidation.error }),
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

    const langCode = typeof language === 'string' ? language : "en-IN";
    console.log(`TTS request: user=${userId}, lang=${langCode}, text length=${textValidation.text!.length}`);

    // Clean text for better pronunciation - preserve natural flow
    const cleanText = textValidation.text!
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
