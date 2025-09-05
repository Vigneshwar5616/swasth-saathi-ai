import { Card, CardContent } from "@/components/ui/card";
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
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Describe your symptoms"
  },
  {
    title: "Heart Health",
    icon: Heart,
    color: "text-red-500",
    bgColor: "bg-red-50",
    description: "Monitor heart wellness"
  },
  {
    title: "Mental Health",
    icon: Brain,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Emotional wellbeing"
  },
  {
    title: "Medications",
    icon: Pill,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Track your medicines"
  },
  {
    title: "Book Appointment",
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Schedule with doctor"
  },
  {
    title: "Emergency Info",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "Urgent medical help"
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
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-border"
            onClick={() => onActionClick?.(action.title)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`w-12 h-12 rounded-full ${action.bgColor} flex items-center justify-center`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{action.title}</h3>
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