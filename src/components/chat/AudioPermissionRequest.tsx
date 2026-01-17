import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Mic, Volume2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AudioPermissionRequestProps {
  onPermissionsGranted: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AudioPermissionRequest({ 
  onPermissionsGranted, 
  open, 
  onOpenChange 
}: AudioPermissionRequestProps) {
  const [micStatus, setMicStatus] = useState<"pending" | "granted" | "denied" | "checking">("pending");
  const [audioStatus, setAudioStatus] = useState<"pending" | "granted" | "checking">("pending");
  const [isTestingAudio, setIsTestingAudio] = useState(false);

  // Check if mic permission was already granted
  useEffect(() => {
    if (open) {
      checkExistingPermissions();
    }
  }, [open]);

  const checkExistingPermissions = async () => {
    try {
      // Check microphone permission status
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        setMicStatus("granted");
      }
    } catch {
      // permissions API not supported, we'll ask anyway
    }
  };

  const requestMicrophonePermission = async () => {
    setMicStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setMicStatus("granted");
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      setMicStatus("denied");
    }
  };

  const testAudioOutput = async () => {
    setIsTestingAudio(true);
    setAudioStatus("checking");
    
    try {
      // Create a short beep sound to test audio output and unlock audio on mobile
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context if suspended (required on mobile)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      
      // Create a pleasant confirmation sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 523.25; // C5 note - pleasant confirmation sound
      gainNode.gain.value = 0.5; // Audible volume
      
      oscillator.start();
      
      // Fade out and stop after 300ms
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.35);
      
      // Also initialize speech synthesis (unlocks on mobile)
      const synth = window.speechSynthesis;
      synth.cancel(); // Clear any pending
      
      // Wait for voices to load
      let voices = synth.getVoices();
      if (voices.length === 0) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            synth.removeEventListener("voiceschanged", handler);
            resolve();
          };
          synth.addEventListener("voiceschanged", handler);
          setTimeout(resolve, 500); // Timeout fallback
        });
        voices = synth.getVoices();
      }
      
      // Speak a brief audible test message
      const testUtterance = new SpeechSynthesisUtterance("Audio ready");
      testUtterance.volume = 0.7; // Audible
      testUtterance.rate = 1.2; // Slightly faster
      
      // Try to find an English voice
      const englishVoice = voices.find(v => v.lang.startsWith("en"));
      if (englishVoice) {
        testUtterance.voice = englishVoice;
      }
      
      synth.speak(testUtterance);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await audioContext.close();
      setAudioStatus("granted");
    } catch (error) {
      console.error("Audio test error:", error);
      // Even if it fails, mark as granted - we tried
      setAudioStatus("granted");
    } finally {
      setIsTestingAudio(false);
    }
  };

  const handleContinue = () => {
    onPermissionsGranted();
    onOpenChange(false);
  };

  const allPermissionsGranted = micStatus === "granted" && audioStatus === "granted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            Enable Voice Features
          </DialogTitle>
          <DialogDescription>
            Allow microphone access to speak your questions and enable audio to hear responses in your language.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Microphone Permission */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Microphone Access</p>
                <p className="text-xs text-muted-foreground">For voice input in any language</p>
              </div>
            </div>
            {micStatus === "granted" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : micStatus === "denied" ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : micStatus === "checking" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button size="sm" onClick={requestMicrophonePermission}>
                Allow
              </Button>
            )}
          </div>

          {/* Audio Output Test */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Audio Output</p>
                <p className="text-xs text-muted-foreground">To hear voice responses</p>
              </div>
            </div>
            {audioStatus === "granted" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : audioStatus === "checking" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button 
                size="sm" 
                onClick={testAudioOutput}
                disabled={isTestingAudio}
              >
                {isTestingAudio ? "Testing..." : "Test"}
              </Button>
            )}
          </div>

          {micStatus === "denied" && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              Microphone access was denied. Please enable it in your browser settings to use voice features.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Skip
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={micStatus !== "granted"}
          >
            {allPermissionsGranted ? "Continue" : "Continue Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
