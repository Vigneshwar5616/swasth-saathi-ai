import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  HelpCircle,
  BookOpen,
  Shield,
  Heart,
  Mic,
  Globe,
  Settings,
  History,
  ExternalLink
} from "lucide-react";

const faqs = [
  {
    question: "How do I use the AI health assistant?",
    answer: "Simply type your health-related question in the chat input on the main page and press send. You can also use voice input by clicking the microphone button. The AI will provide helpful information and suggestions based on your query."
  },
  {
    question: "What languages are supported?",
    answer: "Aarogyasri supports multiple Indian languages including English, Hindi, Telugu, Tamil, Kannada, and Malayalam. You can change your preferred language in Settings > Appearance."
  },
  {
    question: "Is my health data secure?",
    answer: "Yes, your data is protected with enterprise-grade encryption. We follow strict privacy policies and never share your personal health information with third parties. You can manage your privacy settings anytime."
  },
  {
    question: "Can I use voice input?",
    answer: "Yes! Click the microphone button in the chat input to speak your question. The app will transcribe your speech and send it to the AI assistant. Make sure to allow microphone permissions when prompted."
  },
  {
    question: "How do I view my chat history?",
    answer: "Navigate to the History page from the sidebar to see all your previous conversations. You can review past questions and responses at any time."
  },
  {
    question: "Is this app a replacement for medical advice?",
    answer: "No, Aarogyasri is designed to provide general health information and guidance only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns."
  },
  {
    question: "How do I change my account settings?",
    answer: "Go to Settings from the sidebar to update your profile, notification preferences, privacy settings, appearance, and more."
  },
  {
    question: "Is the app free to use?",
    answer: "Yes, Aarogyasri is completely free to use. Enjoy unlimited access to all features including AI health chat, voice input, multiple language support, and conversation history."
  }
];

const features = [
  {
    icon: Heart,
    title: "AI Health Assistant",
    description: "Get instant answers to your health-related questions"
  },
  {
    icon: Mic,
    title: "Voice Input",
    description: "Speak your questions naturally using voice input"
  },
  {
    icon: Globe,
    title: "Multi-language Support",
    description: "Chat in English, Hindi, Telugu, Tamil, and more"
  },
  {
    icon: History,
    title: "Conversation History",
    description: "Access your past conversations anytime"
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your health data is encrypted and secure"
  },
  {
    icon: Settings,
    title: "Customizable",
    description: "Personalize themes, languages, and notifications"
  }
];

const Help = () => {
  const handleEmailContact = () => {
    window.location.href = "mailto:arkatalavigneshwar@gmail.com?subject=Aarogyasri Support Request";
  };

  return (
    <div className="flex min-h-screen max-h-screen w-full overflow-hidden">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Help & Support</h1>
            </div>
            <p className="text-muted-foreground mt-1">Find answers and get assistance</p>
          </div>
        </div>
        
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-none container mx-auto p-6 pb-24 space-y-8">
          {/* Contact Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Contact Us
              </CardTitle>
              <CardDescription>
                Have questions or need help? Reach out to us!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-muted-foreground">For any queries or information</p>
                    </div>
                  </div>
                  <a 
                    href="mailto:arkatalavigneshwar@gmail.com" 
                    className="text-primary font-medium hover:underline flex items-center gap-1 mt-3"
                  >
                    arkatalavigneshwar@gmail.com
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="flex-1 p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Response Time</p>
                      <p className="text-sm text-muted-foreground">We aim to respond within</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-foreground mt-3">24-48 Hours</p>
                </div>
              </div>
              
              <Button onClick={handleEmailContact} className="w-full sm:w-auto mt-6">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>

          {/* Features Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                App Features
              </CardTitle>
              <CardDescription>
                Learn what Aarogyasri can do for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <div 
                    key={index}
                    className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <feature.icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <CardTitle>About Aarogyasri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Aarogyasri is your AI-powered health assistant, designed to provide accessible health information 
                in multiple Indian languages. Our mission is to make health guidance available to everyone.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Version 1.0.0</span>
                <span>•</span>
                <span>Made with ❤️ in India</span>
                <span>•</span>
                <span>© 2024 Aarogyasri</span>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Medical Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                The information provided by Aarogyasri is for general informational purposes only and should not be 
                considered as medical advice. Always consult with a qualified healthcare professional for medical 
                concerns, diagnosis, or treatment. In case of emergency, please contact your local emergency services.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Help;
