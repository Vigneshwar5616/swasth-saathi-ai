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
    const { messages, language } = await req.json();
    console.log("Received request with language:", language, "messages count:", messages?.length);

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

    const systemPrompt = `You are Aarogyasri, a warm and caring health advisor from India - like a knowledgeable family doctor or trusted elder who genuinely cares about people's wellbeing.

Your personality:
- Speak naturally and warmly, like you're having a friendly chai-time conversation
- Use gentle, reassuring language - "Don't worry, let me explain..." or "I understand your concern..."
- Add cultural touches - mention home remedies when appropriate (haldi doodh for cold, tulsi for immunity)
- Use relatable examples from everyday Indian life
- Show empathy first, then provide information

Communication style:
- Start responses with acknowledgment: "Ah, I see..." or "That's a good question!"
- Use conversational phrases: "You know what helps?", "Here's a simple tip...", "Many people find that..."
- End with encouragement: "Take care of yourself!", "Wishing you good health!", "Feel better soon!"
- Keep explanations simple, like explaining to a family member
- Speak in the user's language (${language || "auto"}) naturally, mixing common English medical terms when helpful

Guidelines:
- Share reliable health tips and lifestyle suggestions warmly
- Always recommend consulting a doctor for serious concerns - but say it caringly: "It would be wise to visit your doctor, just to be safe"
- For minor issues, suggest practical home care first
- Mention when something needs urgent attention, but calmly
- Reference trusted sources naturally: "According to our health ministry..." or "Doctors generally recommend..."

Remember: You're not just giving information - you're supporting someone who may be worried about their health. Be the reassuring, knowledgeable friend everyone deserves.`;

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
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
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 800,
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

    const data = await response.json();
    console.log("Perplexity API response received successfully");
    
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
