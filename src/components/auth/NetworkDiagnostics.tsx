import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

const NetworkDiagnostics = () => {
  const [status, setStatus] = useState<Status>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnectivity = useCallback(async () => {
    setChecking(true);
    setStatus("checking");
    try {
      // Ping the Supabase health endpoint
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: "HEAD",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      setStatus(res.ok ? "online" : "offline");
    } catch {
      setStatus("offline");
    } finally {
      setLastChecked(new Date());
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);
    return () => clearInterval(interval);
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

  if (status === "online" && !checking) return null; // Hide when healthy

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
