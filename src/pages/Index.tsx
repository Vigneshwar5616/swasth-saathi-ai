import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, Send, Loader2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { HealthTipsCarousel } from "@/components/dashboard/HealthTipsCarousel";
import LanguageSelector from "@/components/chat/LanguageSelector";
import VoiceToggle from "@/components/chat/VoiceToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message { role: "user" | "assistant"; content: string }

const Index = () => {
  const { user } = useAuth();
  const [language, setLanguage] = useState<string>("en-IN");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  // Load user settings
  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_settings")
      .select("preferred_language, voice_enabled")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      if (data.preferred_language) {
        setLanguage(data.preferred_language === "en" ? "en-IN" : `${data.preferred_language}-IN`);
      }
      if (data.voice_enabled !== null) {
        setVoice(data.voice_enabled);
      }
    }
  };

  // Enhanced speak function with ElevenLabs natural Indian voices
  const speak = async (text: string) => {
    if (!voice) return;
    
    // Cancel any ongoing speech
    synth.cancel();
    
    // Clean text for better pronunciation
    const cleanText = text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "")   // Remove markdown italic
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\n+/g, ". ") // Convert newlines to pauses
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
    
    // Try ElevenLabs first for natural voice
    try {
      const response = await fetch("https://tknpmvtfccepvwegcnfz.supabase.co/functions/v1/elevenlabs-tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: cleanText.substring(0, 2000), // Limit for API
          language: language,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.0;
        await audio.play();
        return;
      }
    } catch (error) {
      console.warn("ElevenLabs TTS failed, falling back to browser TTS:", error);
    }
    
    // Fallback to browser TTS
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    
    sentences.forEach((sentence) => {
      const utter = new SpeechSynthesisUtterance(sentence.trim());
      
      if (voiceForLang) {
        utter.voice = voiceForLang;
      }
      
      utter.lang = language;
      utter.rate = 0.85;
      utter.pitch = 1.1;
      utter.volume = 1.0;
      
      synth.speak(utter);
    });
  };

  const handleMic = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    try {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SR) {
        toast({ title: "Speech not supported", description: "Your browser doesn't support speech recognition." });
        return;
      }
      
      const rec: any = new SR();
      recognitionRef.current = rec;
      rec.lang = language;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      
      rec.onstart = () => {
        setIsListening(true);
        toast({ title: "Listening...", description: "Speak now, I'm listening!" });
      };
      
      rec.onresult = (e: SpeechRecognitionEvent) => {
        const transcript = e.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInput(transcript);
          if (e.results?.[0]?.isFinal) {
            setIsListening(false);
          }
        }
      };
      
      rec.onerror = (event: any) => {
        setIsListening(false);
        console.error("Speech recognition error:", event.error);
        let errorMessage = "Couldn't capture audio. Check permissions.";
        if (event.error === 'not-allowed') {
          errorMessage = "Microphone access denied. Please allow microphone permissions.";
        } else if (event.error === 'no-speech') {
          errorMessage = "No speech detected. Please try again.";
        } else if (event.error === 'network') {
          errorMessage = "Network error. Check your internet connection.";
        }
        toast({ title: "Mic error", description: errorMessage });
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      rec.start();
    } catch (e) {
      setIsListening(false);
      toast({ title: "Mic error", description: String(e) });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const next = [...messages, { role: "user", content: text } as Message];
    setMessages(next);
    setInput("");
    setLoading(true);
    
    let assistantContent = "";
    
    try {
      const resp = await fetch("https://tknpmvtfccepvwegcnfz.supabase.co/functions/v1/health-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: next.slice(-4), // Only send last 4 messages for faster response
          language: language,
          stream: true,
        }),
      });

      if (!resp.ok) throw new Error(await resp.text());
      
      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      // Add empty assistant message that we'll update
      setMessages(curr => [...curr, { role: "assistant", content: "" }]);
      
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
      if (!assistantContent) {
        const fallbackResp = await fetch("https://tknpmvtfccepvwegcnfz.supabase.co/functions/v1/health-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next.slice(-4), language }),
        });
        const data = await fallbackResp.json();
        assistantContent = data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't get an answer right now.";
        setMessages(curr => {
          const updated = [...curr];
          if (updated.length > 0) {
            updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          }
          return updated;
        });
      }
      
      speak(assistantContent);
      
      // Save conversation to database (only for logged in users)
      if (user && assistantContent) {
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
      toast({ title: "Request failed", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const actionPrompts = {
      "Check Symptoms": "I would like to check my symptoms. Can you help me describe what I'm experiencing?",
      "Heart Health": "I want to learn about heart health and cardiovascular wellness.",
      "Mental Health": "I need information about mental health and emotional wellbeing.",
      "Medications": "I have questions about medications and their effects.",
      "Book Appointment": "I need help understanding when I should book a medical appointment.",
      "Emergency Info": "I need to know about emergency medical situations and when to seek immediate help."
    };
    
    const prompt = actionPrompts[action as keyof typeof actionPrompts];
    if (prompt) {
      setInput(prompt);
    }
  };

  return (
    <div className="flex h-screen w-full">
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
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <DashboardHeader 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearchSelect={(query) => setInput(query)}
            />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
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
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{new Date().toLocaleTimeString()}</span>
                  <span className="text-primary font-medium">100% confident</span>
                </div>
              </div>

              <Card className="h-48 overflow-y-auto bg-card">
                <CardContent className="p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
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
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <LanguageSelector value={language} onChange={setLanguage} />
                  <VoiceToggle enabled={voice} onChange={setVoice} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMic}
                      disabled={loading}
                      className={`${isListening ? "bg-red-100 border-red-300 text-red-600" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                    >
                      <Mic className="h-4 w-4 mr-1" />
                      Voice Input
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
                      className="bg-primary hover:bg-primary/90 h-auto px-6"
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
        </main>
      </div>
    </div>
  );
};

export default Index;
