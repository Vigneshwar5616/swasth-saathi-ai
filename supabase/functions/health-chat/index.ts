import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Allowed origins for CORS - restrict to known domains
const ALLOWED_ORIGINS = [
  'https://7cd608d8-2528-4588-8caa-f9efbea178de.lovableproject.com',
  'https://id-preview--7cd608d8-2528-4588-8caa-f9efbea178de.lovable.app',
  'http://localhost:8080',
  'http://localhost:5173',
];

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
    // Reset or create new record
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
  // Try various headers for client IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  const cfIP = req.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  return 'unknown';
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
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

    const { messages, language, stream = false } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
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

    // Comprehensive system prompt for informative responses
    const systemPrompt = `You are Aarogyasri, a knowledgeable and caring health advisor from India - like a trusted family doctor who explains things thoroughly.

RESPONSE STYLE:
- Give detailed, informative answers that educate the user about their health concern
- Explain the "why" behind your advice - help users understand their body
- Use warm, conversational language with natural Hindi/Telugu phrases when appropriate
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
- Respond in ${language || "English"} naturally
- For serious symptoms, warmly but clearly advise consulting a doctor

RESPONSE FORMAT:
- Aim for 200-300 words for a complete, helpful response
- Start with acknowledgment and reassurance
- Provide the main information with practical tips
- End with encouragement and care: "Take care of yourself!", "Wishing you good health!"`;

    // Ensure messages alternate properly (user, assistant, user, assistant...)
    // Perplexity requires this pattern after the system message
    
    // Filter out empty messages and only keep user/assistant
    const validMessages = messages
      .filter((m: { role: string; content: string }) => 
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
        // First message must be user
        alternatingMessages.push({
          role: "user",
          content: msg.content
        });
      }
    }
    
    // If we have no messages or don't start with user, just use the last user message
    if (alternatingMessages.length === 0 || alternatingMessages[0].role !== "user") {
      const lastUserMsg = validMessages.filter((m: { role: string }) => m.role === "user").pop();
      if (lastUserMsg) {
        alternatingMessages.length = 0;
        alternatingMessages.push({
          role: "user" as const,
          content: lastUserMsg.content
        });
      } else {
        // No valid user message found
        return new Response(JSON.stringify({ error: "No valid user message found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Ensure we don't end with assistant (API expects user message last for new response)
    // But actually Perplexity expects the last message to be user for getting a response
    // So if last message is assistant, we should just use the last user message
    if (alternatingMessages[alternatingMessages.length - 1]?.role === "assistant") {
      // Keep only messages up to and including the last user message
      while (alternatingMessages.length > 0 && alternatingMessages[alternatingMessages.length - 1].role === "assistant") {
        alternatingMessages.pop();
      }
    }
    
    // Final safety check - must have at least one user message
    if (alternatingMessages.length === 0) {
      const lastUserMsg = validMessages.filter((m: { role: string }) => m.role === "user").pop();
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
        max_tokens: 800,
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

    // If streaming, pass through the stream directly
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
