import { Shield, Users, CreditCard, Share2, Briefcase, FlaskConical, Pill } from "lucide-react";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";

const claims = [
  { icon: Briefcase, tint: "bg-accent/15 text-accent", title: "Apollo Hospitals", sub: "General Consultation · Oct 24", amount: "₹1,200", status: "Approved", statusTone: "accent" },
  { icon: FlaskConical, tint: "bg-tertiary/15 text-tertiary", title: "Diagnostic Lab", sub: "Full Blood Panel · Oct 20", amount: "₹4,500", status: "Processing", statusTone: "muted" },
  { icon: Pill, tint: "bg-primary/10 text-primary", title: "MedPlus Pharmacy", sub: "Prescription · Oct 15", amount: "₹850", status: "Approved", statusTone: "accent" },
];

export default function Wallet() {
  return (
    <>
      <MobileHeader />
      <div className="px-5 pt-4 pb-6 space-y-6">
        <section>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your health IDs and benefits</p>
        </section>

        {/* Stack of cards */}
        <section className="relative">
          <div className="rounded-2xl bg-tertiary text-tertiary-foreground px-5 pt-4 pb-10 -mb-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest opacity-80">POLICY PLAN</p>
                <p className="text-xl font-bold">Family Platinum</p>
              </div>
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <div className="relative rounded-2xl bg-accent text-accent-foreground px-5 pt-4 pb-10 -mb-6 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest opacity-80">DEPENDENT</p>
                <p className="text-xl font-bold">Ananya Rao</p>
              </div>
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="relative rounded-2xl bg-primary text-primary-foreground p-5 shadow-[var(--shadow-elevated)] min-h-[220px] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest opacity-80">AAROGYASRI HEALTH ID</p>
                <p className="text-2xl font-bold mt-1">Rajesh Kumar Rao</p>
              </div>
              <div className="h-14 w-14 rounded-lg bg-white/20" />
            </div>
            <div className="mt-auto pt-10 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-widest opacity-80">ABHA ADDRESS</p>
                <p className="text-sm font-medium">rajesh.rao@abha</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold tracking-widest opacity-80">BLOOD GROUP</p>
                <p className="text-2xl font-bold leading-none">O+</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button className="rounded-2xl bg-secondary p-4 flex items-center justify-center gap-2 font-semibold text-primary">
            <CreditCard className="h-4 w-4" /> Add Benefit
          </button>
          <button className="rounded-2xl bg-secondary p-4 flex items-center justify-center gap-2 font-semibold text-primary">
            <Share2 className="h-4 w-4" /> Share ID
          </button>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">Recent Claims</h2>
            <button className="text-primary text-sm font-medium">View All</button>
          </div>
          <ul className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
            {claims.map((c) => (
              <li key={c.title} className="flex items-center gap-3 p-4">
                <span className={cn("h-10 w-10 rounded-full grid place-items-center shrink-0", c.tint)}>
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm">{c.amount}</p>
                  <span
                    className={cn(
                      "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1",
                      c.statusTone === "accent" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {c.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}