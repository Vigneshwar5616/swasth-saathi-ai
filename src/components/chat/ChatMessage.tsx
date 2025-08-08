import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ChatRole = "user" | "assistant";

interface ChatMessageProps {
  role: ChatRole;
  content: string;
}

const initials = (role: ChatRole) => (role === "user" ? "You" : "AI");

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";
  return (
    <div className={cn("w-full flex gap-3 items-start", isUser ? "justify-end" : "justify-start")}
      aria-live={isUser ? undefined : "polite"}
    >
      {!isUser && (
        <Avatar className="size-8">
          <AvatarFallback className="bg-secondary text-secondary-foreground">{initials(role)}</AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-[85%] px-4 py-3 text-left border shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground border-primary/20"
            : "bg-card text-card-foreground"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{content}</p>
      </Card>
      {isUser && (
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary text-primary-foreground">{initials(role)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
