import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Mic, Volume2, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface AudioPermissionRequestProps {
  onPermissionsGranted: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Persistent AudioContext to keep audio unlocked across the app
let globalAudioContext: AudioContext | null = null;

export function getGlobalAudioContext(): AudioContext | null {
  return globalAudioContext;
}

export function AudioPermissionRequest({ 
  onPermissionsGranted, 
  open, 
  onOpenChange 
}: AudioPermissionRequestProps) {
  const [micStatus, setMicStatus] = useState<"pending" | "granted" | "denied" | "checking">("pending");
  const [audioStatus, setAudioStatus] = useState<"pending" | "granted" | "checking" | "failed">("pending");
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const audioContextRef = useRef<AudioContext | null>(null);

  // Detect platform on mount
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

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
    setIsSilentMode(false);
    
    try {
      // Create or reuse AudioContext - iOS requires webkit prefix
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContextClass({
          // iOS needs specific sample rate
          sampleRate: platform === "ios" ? 44100 : undefined,
        });
      }
      
      const audioContext = audioContextRef.current;
      
      // Store globally for reuse
      globalAudioContext = audioContext;
      
      // Resume context if suspended (CRITICAL for mobile)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      
      // iOS: Create and play a silent HTML Audio element to "unlock" audio playback
      // This is critical for iOS to allow subsequent audio.play() calls
      if (platform === "ios") {
        try {
          const silentAudio = new Audio();
          silentAudio.setAttribute("playsinline", "true");
          silentAudio.setAttribute("webkit-playsinline", "true");
          // Create a tiny silent MP3 (base64 encoded)
          const silentMp3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYmZ3BCAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
          silentAudio.src = silentMp3;
          silentAudio.volume = 0.01;
          await silentAudio.play().catch(() => {});
          silentAudio.pause();
        } catch (e) {
          console.log("Silent audio unlock attempt:", e);
        }
      }
      
      // iOS silent mode detection: play audio and check if it actually played
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const analyser = audioContext.createAnalyser();
      
      oscillator.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A4 note - more universally supported
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      
      // Wait a bit for audio to play
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if audio is actually playing (silent mode detection for iOS)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const hasAudio = dataArray.some(value => value > 0);
      
      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.stop(audioContext.currentTime + 0.25);
      
      // Test speech synthesis separately (more reliable on mobile)
      await testSpeechSynthesis();
      
      // If on iOS and no audio detected, might be silent mode
      if (platform === "ios" && !hasAudio) {
        setIsSilentMode(true);
      }
      
      setAudioStatus("granted");
    } catch (error) {
      console.error("Audio test error:", error);
      // Try speech synthesis as fallback
      try {
        await testSpeechSynthesis();
        setAudioStatus("granted");
      } catch {
        setAudioStatus("failed");
      }
    } finally {
      setIsTestingAudio(false);
    }
  };

  const testSpeechSynthesis = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      
      if (!synth) {
        reject(new Error("Speech synthesis not supported"));
        return;
      }
      
      synth.cancel(); // Clear any pending
      
      // Wait for voices to load
      const loadVoices = (): SpeechSynthesisVoice[] => synth.getVoices();
      let voices = loadVoices();
      
      const speakTest = () => {
        voices = loadVoices();
        
        // Create test utterance
        const testUtterance = new SpeechSynthesisUtterance("Ready");
        testUtterance.volume = 0.7;
        testUtterance.rate = 1.5; // Quick
        testUtterance.pitch = 1.0;
        
        // Find appropriate voice
        const englishVoice = voices.find(v => v.lang.startsWith("en")) || voices[0];
        if (englishVoice) {
          testUtterance.voice = englishVoice;
        }
        
        testUtterance.onend = () => resolve();
        testUtterance.onerror = (e) => {
          console.warn("TTS test error:", e.error);
          // Resolve anyway - we tried to unlock
          resolve();
        };
        
        synth.speak(testUtterance);
        
        // Android fix: resume if paused
        setTimeout(() => {
          if (synth.paused) synth.resume();
        }, 100);
        
        // Fallback resolve after timeout
        setTimeout(resolve, 2000);
      };
      
      if (voices.length === 0) {
        const onVoicesChanged = () => {
          synth.removeEventListener("voiceschanged", onVoicesChanged);
          speakTest();
        };
        synth.addEventListener("voiceschanged", onVoicesChanged);
        // Fallback if voices never load
        setTimeout(() => {
          synth.removeEventListener("voiceschanged", onVoicesChanged);
          speakTest();
        }, 1000);
      } else {
        speakTest();
      }
    });
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
          {/* Platform-specific tips */}
          {platform === "ios" && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Make sure your device is not in silent mode (check the side switch)</span>
            </div>
          )}
          
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
            ) : audioStatus === "failed" ? (
              <XCircle className="h-5 w-5 text-amber-500" />
            ) : audioStatus === "checking" ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button 
                size="sm" 
                onClick={testAudioOutput}
                disabled={isTestingAudio}
              >
                {isTestingAudio ? "Testing..." : "Test & Enable"}
              </Button>
            )}
          </div>

          {/* Warnings */}
          {micStatus === "denied" && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              Microphone access was denied. Please enable it in your browser settings to use voice features.
            </p>
          )}
          
          {isSilentMode && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Your device may be in silent mode. Turn off the silent switch to hear audio.
            </p>
          )}
          
          {audioStatus === "failed" && (
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              Audio test had issues. Voice responses may not work correctly. Make sure your volume is up.
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
