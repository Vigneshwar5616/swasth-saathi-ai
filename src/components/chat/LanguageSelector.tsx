import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LangOption = {
  code: string;
  label: string;
};

const LANGUAGES: LangOption[] = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "ur-IN", label: "اردو (Urdu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "or-IN", label: "ଓଡ଼ିଆ (Odia)" }
];

interface LanguageSelectorProps {
  value: string;
  onChange: (code: string) => void;
}

export const LanguageSelector = ({ value, onChange }: LanguageSelectorProps) => {
  return (
    <div className="w-full">
      <label className="sr-only" htmlFor="language">Language</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="language" className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
