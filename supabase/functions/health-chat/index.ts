import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { messages, language, stream = false } = await req.json();
    console.log("Received request with language:", language, "stream:", stream);

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

    // Shortened system prompt for faster responses
    const systemPrompt = `You are Aarogyasri, a warm Indian health advisor. Be concise but caring.

Style: Friendly, conversational. Use "Don't worry...", "Here's a tip..." Mix Hindi/regional phrases naturally.
Format: Keep responses under 150 words. Use bullet points for multiple tips.
Rules: Recommend doctors for serious issues. Suggest home remedies for minor ones. Speak in ${language || "English"}.
End with: Brief encouragement like "Take care!" or "Feel better soon!"`;

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-4).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      })),
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
        temperature: 0.3,
        max_tokens: 400,
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
