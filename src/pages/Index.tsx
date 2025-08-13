import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChatMessage } from "@/components/chat/ChatMessage";
import LanguageSelector from "@/components/chat/LanguageSelector";
import VoiceToggle from "@/components/chat/VoiceToggle";

interface Message { role: "user" | "assistant"; content: string }

const Index = () => {
  const [language, setLanguage] = useState<string>("en-IN");
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Welcome! I'm ArogyaAI. I can provide reliable health information in many Indian languages. How can I help today? (I do not provide diagnoses.)",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState(true);
  const [isListening, setIsListening] = useState(false);
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
    } catch (e: any) {
      toast({ title: "Request failed", description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "var(--gradient-primary)" }} />
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground md:text-white">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">ArogyaAI – Multilingual Health Chatbot</h1>
            <p className="mt-4 text-base md:text-lg opacity-90">Reliable health information in your language. Voice and text across major Indian languages. No medical diagnosis.</p>
          </div>
        </div>
      </header>

      <section className="container py-8 md:py-12">
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <Card className="h-max border shadow-[var(--shadow-soft)]">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Language</span>
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>
              <VoiceToggle enabled={voice} onChange={setVoice} />
              <p className="text-xs text-muted-foreground">Disclaimer: Educational purposes only. Always consult a qualified healthcare professional.</p>
            </CardContent>
          </Card>

          <Card className="border shadow-[var(--shadow-elevated)]">
            <CardHeader className="pb-2">
              <CardTitle>Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[48vh] md:h-[56vh] overflow-y-auto pr-1 space-y-4" aria-label="Chat transcript">
                {messages.map((m, i) => (
                  <ChatMessage key={i} role={m.role} content={m.content} />
                ))}
                {loading && <div className="text-sm text-muted-foreground">Thinking…</div>}
              </div>

              <div className="mt-4 grid gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask in your language…"
                  className="min-h-[96px]"
                  aria-label="Your message"
                />
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="secondary" 
                    onClick={handleMic} 
                    type="button" 
                    aria-label="Use microphone"
                    className={isListening ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                    disabled={loading}
                  >
                    {isListening ? "🔴 Stop" : "🎙️ Speak"}
                  </Button>
                  <Button onClick={send} disabled={loading} aria-label="Send message">
                    {loading ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-8">
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            { "@type": "Question", "name": "Does ArogyaAI provide medical advice?", "acceptedAnswer": { "@type": "Answer", "text": "No. It provides general health information only and encourages consulting qualified professionals." } },
            { "@type": "Question", "name": "Which languages are supported?", "acceptedAnswer": { "@type": "Answer", "text": "English (India), Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Urdu, Kannada, Malayalam, Punjabi, Odia, and more (text). Voice support depends on your device/browser voices." } }
          ]
        }) }} />
      </section>
    </main>
  );
};

export default Index;