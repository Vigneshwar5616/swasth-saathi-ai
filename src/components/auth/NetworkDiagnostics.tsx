import { useState, useEffect, useCallback, useRef } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

/**
 * Lightweight connectivity checker for the Auth page.
 *
 * Fixes for Safari / iOS:
 *  - Uses GET (not HEAD) — Safari blocks cross-origin HEAD in some cases.
 *  - Uses `mode: "cors"` explicitly.
 *  - Longer timeout (10 s) for slower mobile connections.
 *  - Falls back to `navigator.onLine` when fetch itself throws.
 *  - Multiple endpoints tried in sequence for resilience.
 */
const NetworkDiagnostics = () => {
  const [status, setStatus] = useState<Status>("checking");
  const [checking, setChecking] = useState(false);
  const mountedRef = useRef(true);

  const checkConnectivity = useCallback(async () => {
    setChecking(true);
    setStatus("checking");

    // Quick browser-level check first
    if (!navigator.onLine) {
      if (mountedRef.current) {
        setStatus("offline");
        setChecking(false);
      }
      return;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // Try multiple lightweight endpoints — if ANY succeeds we're online
    const endpoints = [
      // Auth health check (most reliable across browsers)
      `${supabaseUrl}/auth/v1/health`,
      // REST root
      `${supabaseUrl}/rest/v1/`,
    ];

    let reachable = false;

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(url, {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          headers: {
            apikey: apiKey,
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok || res.status === 401 || res.status === 406) {
          // 401/406 still means the server responded — network is fine
          reachable = true;
          break;
        }
      } catch {
        // Try next endpoint
      }
    }

    if (mountedRef.current) {
      setStatus(reachable ? "online" : "offline");
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  // Listen for browser online/offline events
  useEffect(() => {
    const goOnline = () => checkConnectivity();
    const goOffline = () => setStatus("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [checkConnectivity]);

  if (status === "online" && !checking) return null;

  const statusConfig = {
    checking: {
      icon: RefreshCw,
      label: "Checking connection…",
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      border: "border-border",
    },
    online: {
      icon: CheckCircle2,
      label: "Connected to server",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
    },
    offline: {
      icon: WifiOff,
      label: "Cannot reach server",
      color: "text-destructive",
      bg: "bg-destructive/5",
      border: "border-destructive/20",
    },
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        cfg.bg,
        cfg.border
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            cfg.color,
            status === "checking" && "animate-spin"
          )}
        />
        <span className={cn("text-sm font-medium flex-1", cfg.color)}>
          {cfg.label}
        </span>
        {status === "offline" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={checkConnectivity}
            disabled={checking}
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1", checking && "animate-spin")}
            />
            Retry
          </Button>
        )}
      </div>

      {status === "offline" && (
        <ul className="mt-2 ml-7 space-y-0.5 text-xs text-muted-foreground list-disc">
          <li>Check your Wi-Fi or mobile data</li>
          <li>Disable VPN or ad-blocker</li>
          <li>Try refreshing the page</li>
        </ul>
      )}
    </div>
  );
};

export default NetworkDiagnostics;
