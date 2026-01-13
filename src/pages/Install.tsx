import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, Share, Plus, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Aarogyasri is already installed on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Open App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Install Aarogyasri</CardTitle>
          <CardDescription>
            Get quick access to your health assistant right from your home screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span>Works offline - access anytime</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span>Fast loading - like a native app</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span>No app store needed</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
              <span>Voice & text support in Indian languages</span>
            </div>
          </div>

          {/* Install Instructions */}
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-5 h-5 mr-2" />
              Install Now
            </Button>
          ) : isIOS ? (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Install on iOS:</p>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button in Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <span>Scroll and tap <Plus className="w-4 h-4 inline mx-1" /> "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <span>Tap "Add" to confirm</span>
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Install on Android:</p>
              <ol className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">1</span>
                  <span>Tap the <MoreVertical className="w-4 h-4 inline mx-1" /> menu button in Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">2</span>
                  <span>Tap "Install app" or "Add to Home screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">3</span>
                  <span>Tap "Install" to confirm</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Open this page on your mobile device to install the app
              </p>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Continue in Browser
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
