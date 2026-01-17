import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, Send, Loader2, ArrowDown, Volume2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { HealthTipsCarousel } from "@/components/dashboard/HealthTipsCarousel";
import LanguageSelector from "@/components/chat/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useElevenLabsScribe } from "@/hooks/useElevenLabsScribe";

interface Message { role: "user" | "assistant"; content: string }

const Index = () => {
  const { user } = useAuth();
  const [language, setLanguage] = useState<string>("en-IN");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Setup Web Speech voices with Indian preferences
  const synth = window.speechSynthesis;
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Load voices when they become available
  useEffect(() => {
    const loadVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };
    
    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);
    return () => synth.removeEventListener?.("voiceschanged", loadVoices);
  }, [synth]);

  // Find the best Indian voice for the selected language
  const voiceForLang = useMemo(() => {
    if (availableVoices.length === 0) return null;
    
    // Language code mapping for Indian languages
    const langMap: Record<string, string[]> = {
      "en-IN": ["en-IN", "en_IN", "English India", "English (India)"],
      "hi-IN": ["hi-IN", "hi_IN", "Hindi", "हिंदी"],
      "te-IN": ["te-IN", "te_IN", "Telugu", "తెలుగు"],
      "ta-IN": ["ta-IN", "ta_IN", "Tamil", "தமிழ்"],
      "kn-IN": ["kn-IN", "kn_IN", "Kannada", "ಕನ್ನಡ"],
      "ml-IN": ["ml-IN", "ml_IN", "Malayalam", "മലയാളം"],
      "mr-IN": ["mr-IN", "mr_IN", "Marathi", "मराठी"],
      "bn-IN": ["bn-IN", "bn_IN", "Bengali", "বাংলা"],
      "gu-IN": ["gu-IN", "gu_IN", "Gujarati", "ગુજરાતી"],
    };
    
    const searchTerms = langMap[language] || [language];
    
    // Priority 1: Find exact Indian voice match
    for (const term of searchTerms) {
      const exactMatch = availableVoices.find(v => 
        v.lang === term || 
        v.name.toLowerCase().includes(term.toLowerCase())
      );
      if (exactMatch) return exactMatch;
    }
    
    // Priority 2: Find any voice with Indian locale
    const indianVoice = availableVoices.find(v => 
      v.lang.includes("IN") || 
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("indian")
    );
    if (indianVoice) return indianVoice;
    
    // Priority 3: For Indian languages, find any matching language
    const baseLang = language.split("-")[0];
    const langMatch = availableVoices.find(v => v.lang.startsWith(baseLang));
    if (langMatch) return langMatch;
    
    // Fallback to first available
    return availableVoices[0];
  }, [language, availableVoices]);

  // ElevenLabs Speech-to-Text hook for reliable multi-language transcription
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setInput(text);
  }, []);

  const handleScribeError = useCallback((error: string) => {
    toast({
      title: "Voice Error",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const handleScribeStart = useCallback(() => {
    const langName = language.split("-")[0].toUpperCase();
    toast({ title: "Listening...", description: `Speak now in ${langName}!` });
  }, [language, toast]);

  const {
    isListening,
    isConnecting,
    start: startScribe,
    stop: stopScribe,
  } = useElevenLabsScribe({
    onTranscript: handleTranscript,
    onError: handleScribeError,
    onStart: handleScribeStart,
  });

  // Handle mic button click
  const handleMic = useCallback(() => {
    if (isListening || isConnecting) {
      stopScribe();
    } else {
      startScribe();
    }
  }, [isListening, isConnecting, startScribe, stopScribe]);

  // Load user settings
  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "end"
      });
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle scroll to detect if user scrolled up
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    }
  };

  const loadUserSettings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_settings")
      .select("preferred_language")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      if (data.preferred_language) {
        setLanguage(data.preferred_language === "en" ? "en-IN" : `${data.preferred_language}-IN`);
      }
    }
  };

  // Force speak every reply - never skip, always in selected language
  const speak = (text: string) => {
    // Cancel any ongoing speech first
    synth.cancel();
    setIsSpeaking(false);
    
    // Clean text for better pronunciation
    const cleanText = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "")   // Remove markdown italic
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\n+/g, ". ") // Convert newlines to pauses
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/•/g, ",")   // Replace bullets with pauses
      .trim();
    
    if (!cleanText) {
      console.log("No text to speak");
      return;
    }

    console.log("Speaking text in language:", language, "Voice:", voiceForLang?.name || "default");
    setIsSpeaking(true);
    
    // On mobile, we need to trigger speech from user interaction
    // Use a workaround for Chrome/Safari mobile restrictions
    const startSpeaking = () => {
      // Split into smaller chunks for more natural pacing
      const chunks = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      
      const speakChunk = (index: number) => {
        if (index >= chunks.length) {
          console.log("Finished speaking all chunks");
          setIsSpeaking(false);
          return;
        }
        
        const chunkText = chunks[index].trim();
        if (!chunkText) {
          speakChunk(index + 1);
          return;
        }
        
        const utter = new SpeechSynthesisUtterance(chunkText);
        
        // Find the best voice for the language
        const voices = synth.getVoices();
        let selectedVoice = voiceForLang;
        
        if (!selectedVoice && voices.length > 0) {
          // Try to find a matching voice
          const langPrefix = language.split("-")[0];
          selectedVoice = voices.find(v => v.lang === language) ||
                          voices.find(v => v.lang.startsWith(langPrefix)) ||
                          voices.find(v => v.lang.includes("IN")) ||
                          voices[0];
        }
        
        if (selectedVoice) {
          utter.voice = selectedVoice;
          console.log("Using voice:", selectedVoice.name, "for lang:", language);
        }
        
        // Force the language
        utter.lang = language;
        
        // Optimized settings for natural Indian speech
        utter.rate = 0.9;   // Slightly slower for clarity
        utter.pitch = 1.0;  // Neutral pitch
        utter.volume = 1.0; // Full volume
        
        utter.onend = () => {
          console.log("Chunk", index + 1, "of", chunks.length, "completed");
          // Small delay between chunks for natural pacing
          setTimeout(() => speakChunk(index + 1), 100);
        };
        
        utter.onerror = (e) => {
          console.error("TTS error on chunk", index, ":", e.error);
          // Continue with next chunk even on error
          setTimeout(() => speakChunk(index + 1), 100);
        };
        
        // Chrome bug workaround - pause and resume to prevent cutting off
        synth.speak(utter);
        
        // Chrome mobile fix: resume if paused
        if (synth.paused) {
          synth.resume();
        }
      };

      // Start speaking first chunk
      speakChunk(0);
    };

    // Ensure voices are loaded before speaking
    if (synth.getVoices().length === 0) {
      // Wait for voices to load
      const handleVoicesChanged = () => {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
        startSpeaking();
      };
      synth.addEventListener("voiceschanged", handleVoicesChanged);
      // Fallback timeout if voices never load
      setTimeout(() => {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
        startSpeaking();
      }, 500);
    } else {
      startSpeaking();
    }
  };


  // Helper to get auth headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  // Retry helper with exponential backoff
  const fetchWithRetry = async (
    url: string, 
    options: RequestInit, 
    maxRetries = 3, 
    baseDelay = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          return response;
        }
        
        // For rate limiting, wait and retry
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        if (response.ok) {
          return response;
        }
        
        // For 5xx errors, retry with backoff
        if (response.status >= 500) {
          lastError = new Error(`Server error: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          continue;
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on abort
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        
        // Network error - retry with backoff
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    
    // Filter out any empty messages before adding new one
    const cleanMessages = messages.filter(m => m.content && m.content.trim().length > 0);
    const next = [...cleanMessages, { role: "user", content: text } as Message];
    setMessages(next);
    setInput("");
    setLoading(true);
    
    let assistantContent = "";
    
    try {
      const headers = await getAuthHeaders();
      
      // Try streaming first
      const resp = await fetchWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: next.filter(m => m.content && m.content.trim().length > 0).slice(-4),
            language: language,
            stream: true,
          }),
        }
      );

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error (${resp.status})`;
        throw new Error(errorMessage);
      }
      
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      // Add placeholder assistant message that we'll update
      setMessages(curr => [...curr.filter(m => m.content && m.content.trim().length > 0), { role: "assistant", content: "..." }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(curr => {
                const updated = [...curr];
                if (updated.length > 0) {
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
      
      // If no streaming content, try non-streaming fallback
      if (!assistantContent || assistantContent === "...") {
        const fallbackHeaders = await getAuthHeaders();
        const fallbackResp = await fetchWithRetry(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
          {
            method: "POST",
            headers: fallbackHeaders,
            body: JSON.stringify({ 
              messages: next.filter(m => m.content && m.content.trim().length > 0).slice(-4), 
              language,
              stream: false,
            }),
          }
        );
        
        if (!fallbackResp.ok) {
          const errorData = await fallbackResp.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to get response");
        }
        
        const data = await fallbackResp.json();
        assistantContent = data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't get an answer right now. Please try again.";
        setMessages(curr => {
          const updated = [...curr];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          }
          return updated;
        });
      }
      
      if (assistantContent && assistantContent !== "...") {
        speak(assistantContent);
      }
      
      // Save conversation to database (only for logged in users)
      if (user && assistantContent && assistantContent !== "...") {
        try {
          await supabase
            .from("user_conversations")
            .insert({
              user_id: user.id,
              user_message: text,
              assistant_message: assistantContent,
              language: language,
            });
        } catch (dbError) {
          console.warn('Database save error:', dbError);
        }
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      // Remove the placeholder message on error
      setMessages(curr => curr.filter(m => m.content !== "..." && m.content.trim().length > 0));
      
      let description = "Please try again.";
      if (e?.message?.includes('timeout')) {
        description = "Request timed out. Please try again.";
      } else if (e?.message?.includes('Rate limit')) {
        description = "Too many requests. Please wait a moment.";
      } else if (e?.message) {
        description = e.message;
      }
      
      toast({ title: "Request failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const actionPrompts: Record<string, string> = {
      "Heart Health": `Please provide comprehensive information about heart health and cardiovascular wellness. Include:
- Key factors that affect heart health (diet, exercise, stress, sleep)
- Common heart conditions to be aware of
- Warning signs that need medical attention
- Daily habits for a healthy heart
- Traditional Indian foods and remedies good for the heart (like garlic, arjuna, hawthorn)
- Exercise recommendations
Please explain in a warm, caring way as a health advisor would.`,
      "Mental Health": `Please provide detailed information about mental health and emotional wellbeing. Include:
- What mental health means and why it matters
- Common mental health concerns (stress, anxiety, depression)
- Signs that indicate someone might need support
- Daily practices for emotional wellness (meditation, breathing exercises, yoga)
- Indian approaches to mental wellness (pranayama, mindfulness, Ayurvedic tips)
- When and how to seek professional help
- Tips for supporting loved ones
Please explain compassionately and remove any stigma around mental health.`
    };
    
    const prompt = actionPrompts[action];
    if (!prompt) return;
    
    // Directly trigger send with the prompt
    const cleanMessages = messages.filter(m => m.content && m.content.trim().length > 0);
    const next = [...cleanMessages, { role: "user", content: prompt } as Message];
    setMessages(next);
    setLoading(true);
    
    try {
      const headers = await getAuthHeaders();
      const resp = await fetchWithRetry(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-chat`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            language: language,
            stream: false,
          }),
        }
      );
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Request failed");
      }
      
      const data = await resp.json();
      const assistantContent = data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't get information right now.";
      setMessages(curr => [...curr, { role: "assistant", content: assistantContent }]);
      speak(assistantContent);
      
      if (user && assistantContent) {
        await supabase.from("user_conversations").insert({
          user_id: user.id,
          user_message: prompt,
          assistant_message: assistantContent,
          language: language,
        });
      }
    } catch (e: any) {
      console.error('Quick action error:', e);
      let description = "Please try again.";
      if (e?.message?.includes('timeout')) {
        description = "Request timed out. Please try again.";
      } else if (e?.message?.includes('Rate limit')) {
        description = "Too many requests. Please wait a moment.";
      } else if (e?.message) {
        description = e.message;
      }
      toast({ title: "Request failed", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen max-h-screen w-full overflow-hidden">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            name: "Healthcare AI Dashboard",
            description: "Comprehensive AI-powered health assistant dashboard providing information in multiple languages",
            mainEntity: [
              {
                "@type": "Question",
                name: "How can I get health information in my language?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Our AI health assistant supports multiple languages. Simply select your preferred language and ask your health-related questions."
                }
              },
              {
                "@type": "Question", 
                name: "Is this chatbot a replacement for medical advice?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No, this AI assistant provides general health information only. Always consult healthcare professionals for medical advice."
                }
              }
            ]
          })
        }}
      />

      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="shrink-0 sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-4 md:px-6">
            <SidebarTrigger />
            <DashboardHeader 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSelect={(query) => setInput(query)}
            />
          </div>
        </header>
        
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-none">
          <div className="container mx-auto p-4 md:p-6 pb-24">
            <div className="space-y-6 md:space-y-8">
              <section className="space-y-6">
                <QuickActions onActionClick={handleQuickAction} />
              </section>

              <section>
                <HealthTipsCarousel />
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">HealthAI Assistant</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-primary font-medium">Online</span>
                  </div>
                </div>

                <div className="relative">
                  <Card 
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                    className="min-h-[200px] max-h-[400px] overflow-y-auto bg-card overscroll-none scroll-smooth"
                  >
                    <CardContent className="p-4 space-y-4">
                      {messages.length === 0 && (
                        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary-foreground">AI</span>
                          </div>
                          <div className="text-sm text-foreground">
                            Hello! I'm your AI Health Assistant. I'm here to help you with health information, symptom guidance, and general wellness questions. {!user && "Sign in to save your chat history."} How can I assist you today?
                          </div>
                        </div>
                      )}
                      {messages.map((msg, i) => (
                        <ChatMessage key={i} role={msg.role} content={msg.content} />
                      ))}
                      {loading && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </CardContent>
                  </Card>
                  
                  {/* Scroll to bottom button */}
                  {showScrollButton && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg border bg-background/95 backdrop-blur hover:bg-primary hover:text-primary-foreground transition-all duration-200 animate-fade-in"
                      onClick={() => scrollToBottom()}
                      aria-label="Scroll to bottom"
                    >
                      <ArrowDown className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <LanguageSelector value={language} onChange={setLanguage} />
                    {isSpeaking && (
                      <div className="flex items-center gap-2 text-primary animate-pulse">
                        <Volume2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Speaking...</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMic}
                        disabled={loading || isConnecting}
                        className={`transition-colors ${
                          isListening 
                            ? "bg-red-100 border-red-300 text-red-600 animate-pulse" 
                            : isConnecting
                            ? "bg-yellow-100 border-yellow-300 text-yellow-600"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        }`}
                      >
                        {isConnecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Mic className="h-4 w-4 mr-1" />
                        )}
                        {isListening ? "Listening..." : isConnecting ? "Connecting..." : "Voice Input"}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your health question here..."
                        className="flex-1 resize-none"
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (!loading) send();
                          }
                        }}
                        disabled={loading}
                        aria-label="Health question input"
                      />
                      <Button
                        onClick={send}
                        disabled={loading || !input.trim()}
                        aria-label="Send message"
                        className="bg-primary hover:bg-primary/90 h-auto px-6 transition-opacity"
                        data-send-button
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    This AI assistant provides general health information only. Always consult healthcare professionals for medical advice. {!user && "Sign in to save your chat history."}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
