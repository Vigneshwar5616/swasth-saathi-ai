import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, Send, Loader2 } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import LanguageSelector from "@/components/chat/LanguageSelector";
import VoiceToggle from "@/components/chat/VoiceToggle";
import { supabase } from "@/integrations/supabase/client";

interface Message { role: "user" | "assistant"; content: string }

const Index = () => {
  const [language, setLanguage] = useState<string>("en-IN");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Setup Web Speech voices
  const synth = window.speechSynthesis;
  const voiceForLang = useMemo(() => {
    const voices = synth.getVoices();
    return voices.find(v => v.lang?.toLowerCase() === language.toLowerCase()) || voices.find(v => v.lang?.startsWith(language.split("-")[0])) || voices[0];
  }, [language, synth]);

  useEffect(() => {
    // Chrome needs this to populate voices
    const onVoicesChanged = () => {};
    synth.addEventListener?.("voiceschanged", onVoicesChanged);
    return () => synth.removeEventListener?.("voiceschanged", onVoicesChanged as any);
  }, [synth]);

  const speak = (text: string) => {
    if (!voice) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceForLang) utter.voice = voiceForLang;
    utter.lang = language;
    utter.rate = 1;
    utter.pitch = 1;
    synth.cancel();
    synth.speak(utter);
  };

  const handleMic = async () => {
    if (isListening) {
      // Stop listening
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
    try {
      const resp = await fetch("/supabase/functions/v1/health-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: next,
          language: language,
        }),
      });

      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const reply = data?.choices?.[0]?.message?.content || "I'm sorry, I couldn't get an answer right now.";
      setMessages((curr) => [...curr, { role: "assistant", content: reply }]);
      speak(reply);
      
      // Save conversation to database (owner-only access)
      try {
        const { error } = await supabase.rpc('insert_chat_conversation', {
          p_user_message: text,
          p_assistant_message: reply,
          p_language: language,
          p_user_ip: null, // Could be added if needed
          p_user_agent: navigator.userAgent
        });
        
        if (error) {
          console.warn('Failed to save conversation to database:', error);
        }
      } catch (dbError) {
        // Don't break the chat if database save fails
        console.warn('Database save error:', dbError);
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
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-8">
            <section className="space-y-6">
              <QuickActions onActionClick={handleQuickAction} />
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

              <Card className="h-80 overflow-y-auto bg-card">
                <CardContent className="p-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs font-medium text-primary-foreground">AI</span>
                      </div>
                      <div className="text-sm text-foreground">
                        Hello! I'm your AI Health Assistant. I'm here to help you with health information, symptom guidance, and general wellness questions. Sign in to save your chat history. How can I assist you today?
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
                  This AI assistant provides general health information only. Always consult healthcare professionals for medical advice. Sign in to save your chat history.
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