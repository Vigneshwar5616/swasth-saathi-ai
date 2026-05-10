import { useState } from "react";
import { Search, SlidersHorizontal, MapPin, Navigation, Star, Map } from "lucide-react";
import MobileHeader from "@/components/layout/MobileHeader";
import { cn } from "@/lib/utils";

const filters = ["All", "Multi-specialty", "Cardiology", "Pediatrics", "Neurology", "Oncology"];

const hospitals = [
  {
    name: "Apollo Health City",
    area: "Jubilee Hills",
    distance: "1.2 km away",
    rating: 4.8,
    tags: [
      { label: "Multi-specialty", tone: "accent" },
      { label: "24/7 Emergency", tone: "destructive" },
    ],
  },
  {
    name: "Care Hospitals",
    area: "Banjara Hills",
    distance: "2.8 km away",
    rating: 4.5,
    tags: [
      { label: "Cardiology", tone: "accent" },
      { label: "Neurology", tone: "accent" },
    ],
  },
  {
    name: "Continental Hospitals",
    area: "Gachibowli",
    distance: "5.4 km away",
    rating: 4.9,
    tags: [
      { label: "Multi-specialty", tone: "accent" },
      { label: "NABH Accredited", tone: "tertiary" },
    ],
  },
];

const toneClass = (t: string) =>
  t === "destructive"
    ? "bg-destructive/10 text-destructive"
    : t === "tertiary"
    ? "bg-tertiary/15 text-tertiary"
    : "bg-accent/15 text-accent";

export default function Hospitals() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  return (
    <>
      <MobileHeader />
      <div className="px-5 pt-4 pb-6 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hospitals or symptoms"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-secondary text-sm placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <button className="h-11 w-11 grid place-items-center rounded-xl bg-secondary text-primary">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={cn(
                "shrink-0 px-4 h-9 rounded-full text-sm font-medium transition-colors",
                active === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <h2 className="text-2xl font-bold">Hospitals Nearby</h2>
          <div className="flex items-center gap-1 text-primary text-sm font-medium">
            <MapPin className="h-4 w-4" />
            <span>Hyderabad, TS</span>
          </div>
        </div>

        <ul className="space-y-4">
          {hospitals
            .filter((h) => !query || h.name.toLowerCase().includes(query.toLowerCase()))
            .map((h) => (
              <li
                key={h.name}
                className="rounded-2xl overflow-hidden bg-card border border-border shadow-[var(--shadow-card)]"
              >
                <div className="relative h-40 bg-gradient-to-br from-muted to-secondary">
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/95 rounded-full px-2.5 py-1 text-xs font-semibold shadow">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {h.rating}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{h.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {h.area} · {h.distance}
                      </p>
                    </div>
                    <button className="h-9 w-9 grid place-items-center rounded-lg bg-primary/10 text-primary">
                      <Navigation className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {h.tags.map((t) => (
                      <span
                        key={t.label}
                        className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full", toneClass(t.tone))}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
        </ul>

        <div className="sticky bottom-24 flex justify-center pt-2">
          <button className="bg-primary text-primary-foreground rounded-full px-6 h-12 inline-flex items-center gap-2 font-semibold shadow-[var(--shadow-elevated)]">
            <Map className="h-4 w-4" />
            Map View
          </button>
        </div>
      </div>
    </>
  );
}