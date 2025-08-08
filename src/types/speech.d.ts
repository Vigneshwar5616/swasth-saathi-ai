// Ambient types for Web Speech API (limited subset)
// This avoids TS errors in browsers that provide these at runtime.

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResult[];
}

interface Window {
  webkitSpeechRecognition?: {
    new (): SpeechRecognition;
  };
  SpeechRecognition?: {
    new (): SpeechRecognition;
  };
}
