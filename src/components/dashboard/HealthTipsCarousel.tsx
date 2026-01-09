import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Droplets, 
  Moon, 
  Apple, 
  Footprints, 
  Heart, 
  Smile,
  Sun,
  Leaf
} from "lucide-react";

const healthTips = [
  {
    id: 1,
    title: "Stay Hydrated",
    tip: "Drink 8-10 glasses of water daily. Start your morning with warm water and lemon for better digestion.",
    icon: Droplets,
    gradient: "from-blue-400/20 to-cyan-400/20"
  },
  {
    id: 2,
    title: "Quality Sleep",
    tip: "Aim for 7-8 hours of sleep. Avoid screens 1 hour before bed and maintain a consistent sleep schedule.",
    icon: Moon,
    gradient: "from-indigo-400/20 to-purple-400/20"
  },
  {
    id: 3,
    title: "Eat Fresh & Local",
    tip: "Include seasonal fruits and vegetables in every meal. Traditional Indian foods like dal, sabzi are nutritionally complete.",
    icon: Apple,
    gradient: "from-green-400/20 to-emerald-400/20"
  },
  {
    id: 4,
    title: "Walk Daily",
    tip: "A 30-minute walk after meals aids digestion and keeps your heart healthy. Even 10,000 steps make a big difference!",
    icon: Footprints,
    gradient: "from-orange-400/20 to-amber-400/20"
  },
  {
    id: 5,
    title: "Heart Care",
    tip: "Reduce salt and oil in cooking. Practice deep breathing for 5 minutes daily to lower blood pressure naturally.",
    icon: Heart,
    gradient: "from-rose-400/20 to-pink-400/20"
  },
  {
    id: 6,
    title: "Mental Wellness",
    tip: "Take breaks during work. Practice gratitude and spend quality time with family - it's good for your mind!",
    icon: Smile,
    gradient: "from-yellow-400/20 to-orange-400/20"
  },
  {
    id: 7,
    title: "Morning Sunshine",
    tip: "Get 15-20 minutes of morning sunlight for Vitamin D. It boosts immunity and improves mood naturally.",
    icon: Sun,
    gradient: "from-amber-400/20 to-yellow-400/20"
  },
  {
    id: 8,
    title: "Natural Immunity",
    tip: "Include haldi, tulsi, and ginger in your diet. These traditional remedies strengthen your body's defenses.",
    icon: Leaf,
    gradient: "from-teal-400/20 to-green-400/20"
  }
];

export function HealthTipsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-rotate tips every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % healthTips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + healthTips.length) % healthTips.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % healthTips.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  const currentTip = healthTips[currentIndex];
  const IconComponent = currentTip.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Daily Wellness Tips</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-0">
          <div 
            className={`relative p-6 bg-gradient-to-br ${currentTip.gradient} transition-all duration-500`}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div className="flex items-start gap-4 animate-fade-in" key={currentTip.id}>
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                <IconComponent className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-2">{currentTip.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{currentTip.tip}</p>
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {healthTips.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? "w-6 bg-primary" 
                      : "w-1.5 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Go to tip ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        💡 Tip {currentIndex + 1} of {healthTips.length} • Swipe or click arrows to explore
      </p>
    </div>
  );
}