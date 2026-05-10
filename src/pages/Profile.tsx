import { useNavigate } from "react-router-dom";
import { Pencil, User, History as HistoryIcon, Heart, Bell, HelpCircle, Info, LogOut, ChevronRight } from "lucide-react";
import MobileHeader from "@/components/layout/MobileHeader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const groups: {
  title: string;
  items: { icon: any; label: string; tint: string; to?: string; danger?: boolean }[];
}[] = [
  {
    title: "ACCOUNT SETTINGS",
    items: [
      { icon: User, label: "Personal Information", tint: "bg-primary/10 text-primary", to: "/settings" },
      { icon: HistoryIcon, label: "Medical History", tint: "bg-accent/15 text-accent", to: "/history" },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { icon: Heart, label: "Saved Hospitals", tint: "bg-tertiary/15 text-tertiary", to: "/hospitals" },
      { icon: Bell, label: "Notifications", tint: "bg-primary/10 text-primary", to: "/settings" },
    ],
  },
  {
    title: "APP INFO",
    items: [
      { icon: HelpCircle, label: "Help & Support", tint: "bg-muted text-foreground", to: "/help" },
      { icon: Info, label: "Privacy Policy", tint: "bg-muted text-foreground", to: "/help" },
    ],
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const name = user?.user_metadata?.full_name || "Aarogyasri Member";
  const initials = (name as string)
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <MobileHeader />
      <div className="px-5 pt-4 pb-6 space-y-6">
        <section className="flex flex-col items-center text-center pt-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-secondary to-muted grid place-items-center text-3xl font-bold text-muted-foreground">
              {initials}
            </div>
            <button className="absolute -bottom-1 right-0 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-[var(--shadow-elevated)]">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-bold mt-4">{name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Premium Member · ID: AS-98231
          </p>
        </section>

        {groups.map((g) => (
          <section key={g.title}>
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground px-1 mb-2">
              {g.title}
            </p>
            <ul className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              {g.items.map((it) => (
                <li key={it.label}>
                  <button
                    onClick={() => it.to && navigate(it.to)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0", it.tint)}>
                      <it.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-medium">{it.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <button
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
          className="w-full rounded-2xl bg-card border border-border p-4 flex items-center justify-center gap-2 font-bold text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Aarogyasri Health v2.4.1 (Build 1092)
        </p>
      </div>
    </>
  );
}