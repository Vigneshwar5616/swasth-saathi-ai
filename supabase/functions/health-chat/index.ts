// Supabase Edge Function: health-chat
// - Proxies to Perplexity Chat Completions API
// - Uses SECRET from env if available, otherwise expects apiKey in request body
// Security note: For production, set the PERPLEXITY_API_KEY secret in Supabase.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { messages, language, apiKey } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("PERPLEXITY_API_KEY") || apiKey;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing Perplexity API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are ArogyaAI, a multilingual health information assistant for India.\n\nGuidelines:\n- Answer ONLY with reliable, publicly verifiable health information.\n- Do NOT provide diagnosis or treatment plans. Encourage professional consultation.\n- Use clear, empathetic, culturally aware language for diverse Indian audiences.\n- Prefer explanations in the user's selected language (${language || "auto"}).\n- When relevant, provide short bullet points and actionable steps.\n- If unsure, say you don't know and suggest trusted sources (WHO, MoHFW, NIH).`;

    const finalMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: finalMessages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 800,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 0.5,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({ error: "Upstream error", details: text }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
