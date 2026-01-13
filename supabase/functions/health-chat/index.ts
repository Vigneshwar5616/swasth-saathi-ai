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
