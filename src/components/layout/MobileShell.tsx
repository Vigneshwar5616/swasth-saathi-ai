import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Home, Hospital, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/hospitals", label: "Hospitals", icon: Hospital, end: false },
  { to: "/wallet", label: "Wallet", icon: Wallet, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
];

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-muted/40 flex justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-background flex flex-col shadow-[0_0_60px_-20px_hsl(var(--foreground)/0.15)]">
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-50
                     bg-background/85 backdrop-blur-xl border-t border-border
                     pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-4 px-2 pt-2 pb-2">
            {tabs.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <t.icon className="h-6 w-6" strokeWidth={2} />
                  <span>{t.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default MobileShell;