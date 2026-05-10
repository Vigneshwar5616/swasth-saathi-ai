import { useNavigate } from "react-router-dom";
import { Calendar, HospitalIcon, Siren, Pill, ChevronRight } from "lucide-react";
import MobileHeader from "@/components/layout/MobileHeader";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning,";
  if (h < 18) return "Good Afternoon,";
  return "Good Evening,";
};

const quickActions = [
  { label: "Book Appointment", icon: Calendar, tint: "bg-primary/10 text-primary", to: "/hospitals" },
  { label: "Find Hospital", icon: HospitalIcon, tint: "bg-accent/15 text-accent", to: "/hospitals" },
  { label: "Emergency Info", icon: Siren, tint: "bg-destructive/10 text-destructive", to: "/profile" },
  { label: "Pharmacy", icon: Pill, tint: "bg-tertiary/15 text-tertiary", to: "/wallet" },
];

const tips = [
  { tag: "PHYSICAL", text: "15 mins of morning yoga to boost energy.", tint: "bg-accent/10 border-accent/30 text-accent" },
  { tag: "MENTAL", text: "Try a 5-minute mindful breathing session.", tint: "bg-tertiary/10 border-tertiary/30 text-tertiary" },
  { tag: "NUTRITION", text: "Add a handful of nuts to your snack today.", tint: "bg-primary/10 border-primary/30 text-primary" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || (user?.email?.split("@")[0] ?? "there");
  const used = 45000;
  const total = 500000;
  const pct = Math.round((used / total) * 100);

  return (
    <>
      <MobileHeader />
      <div className="px-5 pt-5 pb-6 space-y-6">
        <section>
          <p className="text-base text-muted-foreground">{greeting()}</p>
          <h1 className="text-3xl font-bold tracking-tight leading-tight">{name}</h1>
        </section>

        {/* Active Coverage card */}
        <section className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-[var(--shadow-elevated)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold tracking-widest opacity-80">CURRENT PLAN</p>
              <h2 className="text-2xl font-bold mt-1">Active Coverage</h2>
            </div>
            <span className="text-xs font-semibold bg-accent text-accent-foreground rounded-full px-3 py-1">
              Premium Plus
            </span>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-90">Benefits Used</span>
              <span className="font-medium">₹{used.toLocaleString("en-IN")} / ₹{total.toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs mt-3 opacity-80">Valid until 12 Dec 2024. Next renewal in 245 days.</p>
          </div>
        </section>

        {/* Quick actions */}
        <section className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="text-left rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)] hover:bg-muted/30 transition-colors"
            >
              <span className={cn("inline-flex h-11 w-11 rounded-xl items-center justify-center", a.tint)}>
                <a.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-base leading-snug">{a.label}</p>
            </button>
          ))}
        </section>

        {/* Daily Wellness Tips */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold">Daily Wellness Tips</h3>
            <button className="text-primary text-sm font-medium">View All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 snap-x">
            {tips.map((t) => (
              <div
                key={t.tag}
                className={cn(
                  "min-w-[260px] snap-start rounded-2xl border p-4 flex gap-3 items-center",
                  t.tint
                )}
              >
                <div className="h-14 w-14 rounded-xl bg-background/60 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold tracking-widest">{t.tag}</p>
                  <p className="text-sm text-foreground mt-1 leading-snug">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Wellness score + ring */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]">
            <p className="text-sm text-muted-foreground">Wellness Score</p>
            <div className="mt-6 flex items-end gap-2">
              <span className="text-5xl font-bold text-primary leading-none">84</span>
              <span className="text-xs font-semibold text-accent mb-1">+2% this week</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)] flex flex-col items-center justify-center">
            <ProgressRing value={70} />
            <p className="text-sm font-medium mt-2">Goal Reach</p>
          </div>
        </section>

        <button
          onClick={() => navigate("/history")}
          className="w-full flex items-center justify-between rounded-2xl bg-card border border-border p-4 text-left"
        >
          <span className="font-medium">View AI chat history</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </>
  );
};

function ProgressRing({ value }: { value: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-semibold">{value}%</span>
    </div>
  );
}

export default Index;