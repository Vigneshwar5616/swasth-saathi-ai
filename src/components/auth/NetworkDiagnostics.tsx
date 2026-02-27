import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NetworkDiagnostics = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [checking, setChecking] = useState(false);

  const recheck = () => {
    setChecking(true);
    // Browser online status is the most reliable cross-network/safari-safe signal
    // and avoids false negatives from cross-origin probe blocking.
    setTimeout(() => {
      setIsOnline(navigator.onLine);
      setChecking(false);
    }, 400);
  };

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Hide when browser reports connectivity
  if (isOnline) return null;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2",
        "bg-destructive/5 border-destructive/20"
      )}
    >
      <div className="flex items-center gap-3">
        <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
        <span className="text-sm font-medium flex-1 text-destructive">
          You are offline
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={recheck}
          disabled={checking}
        >
          <RefreshCw className={cn("h-3 w-3 mr-1", checking && "animate-spin")} />
          Retry
        </Button>
      </div>

      <ul className="mt-2 ml-7 space-y-0.5 text-xs text-muted-foreground list-disc">
        <li>Check your Wi-Fi or mobile data</li>
        <li>Disable VPN or ad-blocker</li>
        <li>Try refreshing the page</li>
      </ul>
    </div>
  );
};

export default NetworkDiagnostics;
