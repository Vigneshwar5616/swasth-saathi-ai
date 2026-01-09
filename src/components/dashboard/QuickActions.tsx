import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Stethoscope, 
  Heart, 
  Brain, 
  Pill, 
  Calendar, 
  AlertTriangle 
} from "lucide-react";

const quickActions = [
  {
    title: "Check Symptoms",
    icon: Stethoscope,
    description: "Describe your symptoms",
    comingSoon: false
  },
  {
    title: "Heart Health",
    icon: Heart,
    description: "Monitor heart wellness",
    comingSoon: false
  },
  {
    title: "Mental Health",
    icon: Brain,
    description: "Emotional wellbeing",
    comingSoon: false
  },
  {
    title: "Medications",
    icon: Pill,
    description: "Track your medicines",
    comingSoon: true
  },
  {
    title: "Book Appointment",
    icon: Calendar,
    description: "Schedule with doctor",
    comingSoon: true
  },
  {
    title: "Emergency Info",
    icon: AlertTriangle,
    description: "Urgent medical help",
    comingSoon: true
  },
];

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card 
            key={action.title}
            className={`relative overflow-hidden transition-all duration-300 border-border ${
              action.comingSoon 
                ? "opacity-70 cursor-not-allowed bg-muted/30" 
                : "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 bg-card"
            }`}
            onClick={() => !action.comingSoon && onActionClick?.(action.title)}
          >
            {action.comingSoon && (
              <Badge 
                variant="secondary" 
                className="absolute top-2 right-2 text-xs bg-accent/20 text-accent-foreground"
              >
                Coming Soon
              </Badge>
            )}
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  action.comingSoon 
                    ? "bg-muted" 
                    : "bg-gradient-to-br from-primary/10 to-accent/10"
                }`}>
                  <action.icon className={`w-7 h-7 ${
                    action.comingSoon ? "text-muted-foreground" : "text-primary"
                  }`} />
                </div>
                <div>
                  <h3 className={`font-medium ${
                    action.comingSoon ? "text-muted-foreground" : "text-foreground"
                  }`}>{action.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}