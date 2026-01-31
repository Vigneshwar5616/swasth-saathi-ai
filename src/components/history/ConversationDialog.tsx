import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

interface Conversation {
  id: string;
  user_message: string;
  assistant_message: string;
  language: string | null;
  created_at: string;
}

interface ConversationDialogProps {
  conversation: Conversation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getLanguageLabel: (lang: string | null) => string;
}

export const ConversationDialog = ({
  conversation,
  open,
  onOpenChange,
  getLanguageLabel,
}: ConversationDialogProps) => {
  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(conversation.created_at), "MMMM d, yyyy 'at' h:mm a")}
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs ml-2">
              {getLanguageLabel(conversation.language)}
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4">
            {/* User Message */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                  You
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-primary text-primary-foreground p-4">
                <p className="text-sm font-medium mb-1">Your Question</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {conversation.user_message}
                </p>
              </div>
            </div>

            {/* Assistant Message */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-1 text-foreground">AI Response</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {conversation.assistant_message}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
