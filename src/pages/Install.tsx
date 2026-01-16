import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, Share, Plus, MoreVertical, RefreshCw, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const checkIfInstalled = useCallback(() => {
    // Check multiple ways if app is installed
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    const isInWebAppiOS = (navigator as any).standalone === true;
    const isFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
    
    return isStandaloneMode || isInWebAppiOS || isFullscreen;
  }, []);

  useEffect(() => {
    // Check if already installed
    const installed = checkIfInstalled();
    setIsInstalled(installed);
    setIsStandalone(installed);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // For iOS, we can't use beforeinstallprompt, show manual instructions after delay
    if (isIOSDevice) {
      setTimeout(() => setShowManualInstructions(true), 500);
    }

    // Listen for install prompt (works on Android Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log("beforeinstallprompt event fired");
      e.preventDefault();
      setDeferredPrompt(e);
      setShowManualInstructions(false);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      console.log("App was installed");
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("App installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // If no prompt after 3 seconds on Android, show manual instructions
    const timeoutId = setTimeout(() => {
      if (!deferredPrompt && isAndroidDevice && !installed) {
        setShowManualInstructions(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timeoutId);
    };
  }, [checkIfInstalled, deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowManualInstructions(true);
      return;
    }

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        toast.success("Installing Aarogyasri...");
      } else {
        toast.info("Installation cancelled. You can install anytime from this page.");
      }
    } catch (error) {
      console.error("Install error:", error);
      toast.error("Installation failed. Please try the manual method below.");
      setShowManualInstructions(true);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-2 border-accent/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Already Installed!</CardTitle>
            <CardDescription className="text-base">
              Aarogyasri is ready on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Look for the Aarogyasri icon on your home screen
            </p>
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              <ExternalLink className="w-5 h-5 mr-2" />
              Open App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary via-primary to-accent rounded-2xl flex items-center justify-center mb-4 shadow-xl transform hover:scale-105 transition-transform">
            <Smartphone className="w-12 h-12 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Install Aarogyasri</CardTitle>
          <CardDescription className="text-base">
            Your AI Health Assistant - Always Available
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-sm text-foreground">Why install?</p>
            <div className="grid gap-2">
              {[
                "Works offline - access anytime",
                "Lightning fast - like a native app",
                "No app store or downloads needed",
                "Voice support in 10+ Indian languages"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Install Button - Always show if we have deferred prompt */}
          {deferredPrompt && (
            <Button 
              onClick={handleInstall} 
              className="w-full h-14 text-lg font-semibold shadow-lg" 
              size="lg"
              disabled={isInstalling}
            >
              {isInstalling ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Install Now - Free
                </>
              )}
            </Button>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-5 space-y-4 border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Share className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold">Install on iPhone/iPad</p>
              </div>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <span className="font-medium">Tap Share</span>
                    <p className="text-sm text-muted-foreground">Tap the <Share className="w-4 h-4 inline mx-1 text-primary" /> button at the bottom of Safari</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <div>
                    <span className="font-medium">Add to Home Screen</span>
                    <p className="text-sm text-muted-foreground">Scroll down and tap <Plus className="w-4 h-4 inline mx-1 text-primary" /> "Add to Home Screen"</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <div>
                    <span className="font-medium">Confirm</span>
                    <p className="text-sm text-muted-foreground">Tap "Add" in the top right corner</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Android Instructions - show if no deferred prompt or explicitly requested */}
          {isAndroid && (showManualInstructions || !deferredPrompt) && (
            <div className="bg-gradient-to-br from-muted to-muted/50 rounded-xl p-5 space-y-4 border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MoreVertical className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold">Install on Android</p>
              </div>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <div>
                    <span className="font-medium">Open Menu</span>
                    <p className="text-sm text-muted-foreground">Tap <MoreVertical className="w-4 h-4 inline mx-1 text-primary" /> (3 dots) in Chrome's top right</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <div>
                    <span className="font-medium">Install App</span>
                    <p className="text-sm text-muted-foreground">Tap "Install app" or "Add to Home screen"</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <div>
                    <span className="font-medium">Confirm</span>
                    <p className="text-sm text-muted-foreground">Tap "Install" to add to your home screen</p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Desktop/Unknown device fallback */}
          {!isIOS && !isAndroid && !deferredPrompt && (
            <div className="bg-muted/50 rounded-xl p-5 text-center space-y-3 border">
              <Smartphone className="w-10 h-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Open this page on your <strong>mobile phone</strong> to install the app
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Continue in Browser
            </Button>
            
            {(isAndroid || isIOS) && !deferredPrompt && (
              <p className="text-xs text-center text-muted-foreground">
                Having trouble? Make sure you're using {isIOS ? "Safari" : "Chrome"} browser.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
