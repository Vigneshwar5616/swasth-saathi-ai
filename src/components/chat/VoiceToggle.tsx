import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface VoiceToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

export const VoiceToggle = ({ enabled, onChange }: VoiceToggleProps) => {
  return (
    <div className="flex items-center gap-2">
      <Switch id="voice-enabled" checked={enabled} onCheckedChange={onChange} />
      <Label htmlFor="voice-enabled">Speak replies</Label>
    </div>
  );
};

export default VoiceToggle;
