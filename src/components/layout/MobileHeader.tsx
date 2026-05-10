import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function MobileHeader({ title = "Aarogyasri" }: { title?: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-5 h-14">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center gap-3"
          aria-label="Profile"
        >
          <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold grid place-items-center">
            {initials}
          </span>
          <span className="text-lg font-bold tracking-tight">{title}</span>
        </button>
        <button
          className="text-primary p-2 -mr-2"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default MobileHeader;