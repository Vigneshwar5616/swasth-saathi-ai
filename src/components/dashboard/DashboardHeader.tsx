import { useState, useEffect, useRef } from "react";
import { Search, Moon, Sun, Loader2, Newspaper, Activity, Pill, Heart, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  title: string;
  description: string;
  category: string;
}

interface DashboardHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSelect?: (query: string) => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  news: Newspaper,
  symptoms: Activity,
  medications: Pill,
  wellness: Heart,
  general: Info,
};

const categoryColors: Record<string, string> = {
  news: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  symptoms: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medications: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  wellness: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function DashboardHeader({ searchQuery, onSearchChange, onSearchSelect }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      // Only search if user is authenticated
      if (!user) {
        setResults([]);
        setShowResults(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          console.log("No active session for search");
          setResults([]);
          setShowResults(false);
          return;
        }
        
        const resp = await fetch("https://tknpmvtfccepvwegcnfz.supabase.co/functions/v1/health-search", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ query: searchQuery }),
        });
        
        if (resp.ok) {
          const data = await resp.json();
          setResults(data.results || []);
          setShowResults(true);
        } else if (resp.status === 401) {
          console.log("Search requires authentication");
          setResults([]);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    onSearchSelect?.(result.title);
    setShowResults(false);
  };

  return (
    <div className="flex items-center gap-2 md:gap-4 flex-1">
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          {loading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search health topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-10 bg-muted/50 border-muted focus:bg-background transition-all text-sm"
          />
        </div>
        
        {/* Search Results Dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
            <div className="p-2 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground px-2">Latest health updates for "{searchQuery}"</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, index) => {
                const Icon = categoryIcons[result.category] || Info;
                const colorClass = categoryColors[result.category] || categoryColors.general;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-start gap-3 border-b border-border last:border-0"
                  >
                    <div className={cn("p-2 rounded-lg shrink-0", colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground line-clamp-1">{result.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{result.description}</p>
                      <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded-full mt-1.5 capitalize", colorClass)}>
                        {result.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="h-9 w-9 shrink-0"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}
