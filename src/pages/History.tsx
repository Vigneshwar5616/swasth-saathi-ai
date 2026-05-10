import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Calendar, Trash2, Search, Loader2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ConversationDialog } from "@/components/history/ConversationDialog";

interface Conversation {
  id: string;
  user_message: string;
  assistant_message: string;
  language: string | null;
  created_at: string;
}

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadConversations();
  }, [user, navigate]);

  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("user_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading conversations:", error);
      toast({ title: "Error", description: "Failed to load chat history" });
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  };

  const deleteConversation = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("user_conversations")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete conversation" });
    } else {
      setConversations(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Conversation removed" });
    }
    setDeletingId(null);
  };

  const filteredConversations = conversations.filter(
    c => 
      c.user_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.assistant_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLanguageLabel = (lang: string | null) => {
    const languages: Record<string, string> = {
      "en-IN": "English",
      "hi-IN": "Hindi",
      "te-IN": "Telugu",
      "ta-IN": "Tamil",
      "kn-IN": "Kannada",
      "ml-IN": "Malayalam",
      "mr-IN": "Marathi",
      "bn-IN": "Bengali",
      "gu-IN": "Gujarati",
      "pa-IN": "Punjabi",
    };
    return lang ? languages[lang] || lang : "English";
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4">
            <h1 className="text-lg font-semibold truncate">Chat History</h1>
            <div className="flex-1" />
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-none p-4 md:p-6 pb-24">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <Card className="max-w-md mx-auto mt-8">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  {searchQuery ? "No matching conversations" : "No chat history yet"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Start a conversation with the AI assistant to see your history here"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate("/")}>
                    Start Chatting
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 max-w-4xl mx-auto">
              <p className="text-sm text-muted-foreground">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}
              </p>
              
              {filteredConversations.map((conversation) => (
                <Card 
                  key={conversation.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setDialogOpen(true);
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(conversation.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                          {getLanguageLabel(conversation.language)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConversation(conversation);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                          disabled={deletingId === conversation.id}
                        >
                          {deletingId === conversation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">You</span>
                      </div>
                      <p className="text-sm leading-relaxed line-clamp-2">
                        {conversation.user_message}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary-foreground">AI</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {conversation.assistant_message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <ConversationDialog
          conversation={selectedConversation}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          getLanguageLabel={getLanguageLabel}
        />
      </div>
    </div>
  );
};

export default History;
