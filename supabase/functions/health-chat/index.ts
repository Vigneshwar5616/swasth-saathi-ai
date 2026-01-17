import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://7cd608d8-2528-4588-8caa-f9efbea178de.lovableproject.com',
  'https://id-preview--7cd608d8-2528-4588-8caa-f9efbea178de.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

// Valid languages allowlist
const VALID_LANGUAGES = [
  'en-IN', 'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 
  'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'English'
];

// Input validation limits
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TOTAL_CONTENT_LENGTH = 10000;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const ANONYMOUS_RATE_LIMIT = 5; // 5 requests per minute for anonymous users
const AUTHENTICATED_RATE_LIMIT = 30; // 30 requests per minute for authenticated users

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

function getRateLimitKey(ip: string, userId?: string): string {
  return userId ? `user:${userId}` : `ip:${ip}`;
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

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = req.headers.get('x-real-ip');
  if (realIP) return realIP;
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  return 'unknown';
}

// Input sanitization - remove potentially dangerous patterns
function sanitizeContent(content: string): string {
  return content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Validate message structure
function validateMessage(msg: unknown): { valid: boolean; role?: string; content?: string; error?: string } {
  if (!msg || typeof msg !== 'object') {
    return { valid: false, error: 'Invalid message format' };
  }
  
  const m = msg as Record<string, unknown>;
  
  if (typeof m.role !== 'string' || !['user', 'assistant', 'system'].includes(m.role)) {
    return { valid: false, error: 'Invalid message role' };
  }
  
  if (typeof m.content !== 'string') {
    return { valid: false, error: 'Message content must be a string' };
  }
  
  if (m.content.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message content exceeds ${MAX_MESSAGE_LENGTH} characters` };
  }
  
  const sanitizedContent = sanitizeContent(m.content);
  
  return { valid: true, role: m.role, content: sanitizedContent };
}

// Validate entire request body
function validateRequestBody(body: unknown): { 
  valid: boolean; 
  messages?: Array<{ role: string; content: string }>; 
  language?: string;
  stream?: boolean;
  error?: string 
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const b = body as Record<string, unknown>;
  
  // Validate messages array
  if (!Array.isArray(b.messages)) {
    return { valid: false, error: 'messages must be an array' };
  }
  
  if (b.messages.length === 0) {
    return { valid: false, error: 'messages array cannot be empty' };
  }
  
  if (b.messages.length > MAX_MESSAGES) {
    return { valid: false, error: `Maximum ${MAX_MESSAGES} messages allowed` };
  }
  
  // Validate each message
  const validatedMessages: Array<{ role: string; content: string }> = [];
  let totalContentLength = 0;
  
  for (const msg of b.messages) {
    const result = validateMessage(msg);
    if (!result.valid) {
      return { valid: false, error: result.error };
    }
    
    totalContentLength += result.content!.length;
    if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
      return { valid: false, error: `Total content length exceeds ${MAX_TOTAL_CONTENT_LENGTH} characters` };
    }
    
    if (result.content!.trim().length > 0) {
      validatedMessages.push({ role: result.role!, content: result.content! });
    }
  }
  
  // Validate language
  let language = 'English';
  if (b.language !== undefined) {
    if (typeof b.language !== 'string') {
      return { valid: false, error: 'language must be a string' };
    }
    // Check against allowlist
    if (!VALID_LANGUAGES.includes(b.language)) {
      // Default to English if invalid language provided
      language = 'English';
      console.log(`Invalid language "${b.language}", defaulting to English`);
    } else {
      language = b.language;
    }
  }
  
  // Validate stream
  let stream = false;
  if (b.stream !== undefined) {
    if (typeof b.stream !== 'boolean') {
      return { valid: false, error: 'stream must be a boolean' };
    }
    stream = b.stream;
  }
  
  return { valid: true, messages: validatedMessages, language, stream };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(req);
    let userId: string | undefined;
    let rateLimit = ANONYMOUS_RATE_LIMIT;
    
    // Check for authentication
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const token = authHeader.replace('Bearer ', '');
        const { data, error } = await supabase.auth.getClaims(token);
        
        if (!error && data?.claims?.sub) {
          userId = data.claims.sub;
          rateLimit = AUTHENTICATED_RATE_LIMIT;
          console.log("Authenticated user:", userId);
        }
      } catch (authError) {
        console.log("Auth check failed, continuing as anonymous:", authError);
      }
    }
    
    // Apply rate limiting
    const rateLimitKey = getRateLimitKey(clientIP, userId);
    const rateLimitResult = checkRateLimit(rateLimitKey, rateLimit);
    
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for ${rateLimitKey}`);
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
    
    console.log(`Request from ${userId ? `user:${userId}` : `IP:${clientIP}`}, remaining: ${rateLimitResult.remaining}`);

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const validation = validateRequestBody(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { messages, language, stream } = validation;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("PERPLEXITY_API_KEY");
    if (!key) {
      console.error("PERPLEXITY_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Missing Perplexity API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get language name for clearer instruction
    const languageNames: Record<string, string> = {
      'en-IN': 'English',
      'hi-IN': 'Hindi (हिंदी)',
      'te-IN': 'Telugu (తెలుగు)',
      'ta-IN': 'Tamil (தமிழ்)',
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
      'ml-IN': 'Malayalam (മലയാളം)',
      'mr-IN': 'Marathi (मराठी)',
      'bn-IN': 'Bengali (বাংলা)',
      'gu-IN': 'Gujarati (ગુજરાતી)',
      'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)',
      'or-IN': 'Odia (ଓଡ଼ିଆ)',
      'ur-IN': 'Urdu (اردو)',
    };
    
    const targetLanguage = languageNames[language!] || language || 'English';

    // Comprehensive system prompt for informative responses
    const systemPrompt = `You are Aarogyasri, a knowledgeable and caring health advisor from India - like a trusted family doctor who explains things thoroughly.

CRITICAL LANGUAGE REQUIREMENT:
- You MUST respond ONLY in ${targetLanguage}. This is absolutely mandatory.
- Do NOT mix languages. Every single word of your response must be in ${targetLanguage}.
- If the user asks in a different language, still respond ONLY in ${targetLanguage}.
- For ${targetLanguage === 'English' ? 'English' : 'non-English languages'}, use the native script (${targetLanguage === 'Hindi (हिंदी)' ? 'Devanagari' : targetLanguage === 'Telugu (తెలుగు)' ? 'Telugu script' : targetLanguage === 'Tamil (தமிழ்)' ? 'Tamil script' : targetLanguage === 'Kannada (ಕನ್ನಡ)' ? 'Kannada script' : targetLanguage === 'Malayalam (മലയാളം)' ? 'Malayalam script' : targetLanguage === 'Bengali (বাংলা)' ? 'Bengali script' : targetLanguage === 'Gujarati (ગુજરાતી)' ? 'Gujarati script' : targetLanguage === 'Marathi (मराठी)' ? 'Devanagari' : targetLanguage === 'Punjabi (ਪੰਜਾਬੀ)' ? 'Gurmukhi' : targetLanguage === 'Odia (ଓଡ଼ିଆ)' ? 'Odia script' : targetLanguage === 'Urdu (اردو)' ? 'Urdu script' : 'native script'}).

RESPONSE STYLE:
- Give detailed, informative answers that educate the user about their health concern
- Explain the "why" behind your advice - help users understand their body
- Use warm, conversational language appropriate for ${targetLanguage}
- Structure longer answers with clear sections or bullet points for readability

CONTENT GUIDELINES:
- Provide comprehensive information: causes, symptoms, remedies, prevention tips
- Include practical home remedies using common Indian ingredients (haldi, tulsi, jeera, adrak)
- Mention lifestyle factors: diet, sleep, exercise, stress management
- Explain when symptoms might indicate something serious requiring medical attention
- Share relevant Ayurvedic or traditional wisdom when appropriate

IMPORTANT RULES:
- NEVER include citation numbers, reference numbers, or brackets like [1], [2], etc.
- Do not add source references or footnotes at the end
- Write naturally as if speaking to a family member, not an academic paper
- For serious symptoms, warmly but clearly advise consulting a doctor

RESPONSE FORMAT:
- Aim for 200-300 words for a complete, helpful response
- Start with acknowledgment and reassurance
- Provide the main information with practical tips
- End with encouragement and care in ${targetLanguage}`;

    // Filter only user/assistant messages
    const validMessages = messages.filter(m => 
      (m.role === "user" || m.role === "assistant") && 
      m.content && 
      m.content.trim().length > 0
    );
    
    // Build alternating message array ensuring user starts first
    const alternatingMessages: ChatMessage[] = [];
    
    for (let i = 0; i < validMessages.length; i++) {
      const msg = validMessages[i];
      const expectedRole = alternatingMessages.length % 2 === 0 ? "user" : "assistant";
      
      if (msg.role === expectedRole) {
        alternatingMessages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content
        });
      } else if (msg.role === "user" && alternatingMessages.length === 0) {
        alternatingMessages.push({
          role: "user",
          content: msg.content
        });
      }
    }
    
    // If we have no messages or don't start with user, just use the last user message
    if (alternatingMessages.length === 0 || alternatingMessages[0].role !== "user") {
      const lastUserMsg = validMessages.filter(m => m.role === "user").pop();
      if (lastUserMsg) {
        alternatingMessages.length = 0;
        alternatingMessages.push({
          role: "user" as const,
          content: lastUserMsg.content
        });
      } else {
        return new Response(JSON.stringify({ error: "No valid user message found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Ensure we don't end with assistant
    if (alternatingMessages[alternatingMessages.length - 1]?.role === "assistant") {
      while (alternatingMessages.length > 0 && alternatingMessages[alternatingMessages.length - 1].role === "assistant") {
        alternatingMessages.pop();
      }
    }
    
    // Final safety check
    if (alternatingMessages.length === 0) {
      const lastUserMsg = validMessages.filter(m => m.role === "user").pop();
      if (lastUserMsg) {
        alternatingMessages.push({
          role: "user" as const,
          content: lastUserMsg.content
        });
      }
    }

    console.log("Final messages count:", alternatingMessages.length, "roles:", alternatingMessages.map(m => m.role).join(","));

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...alternatingMessages,
    ];

    console.log("Calling Perplexity API...");
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: finalMessages,
        temperature: 0.4,
        max_tokens: 1200, // Increased for complete responses
        stream: stream,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Perplexity API error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Upstream error", details: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    console.log("Perplexity API response received");
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
