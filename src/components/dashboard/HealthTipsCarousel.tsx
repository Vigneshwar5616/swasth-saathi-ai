import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Leaf,
  Brain,
  Activity,
  Eye,
  Zap,
  Shield,
  Clock,
  Sparkles
} from "lucide-react";

const healthTips = [
  {
    id: 1,
    title: "Hydration Science",
    tip: "Your body loses 2-3 liters of water daily through breathing, sweating, and digestion. Drink water 30 mins before meals to boost metabolism by 24-30%. Add a pinch of pink salt for electrolyte balance.",
    icon: Droplets,
    gradient: "from-blue-400/20 to-cyan-400/20",
    category: "Daily Essential",
    fact: "Mild dehydration (1-2%) can impair cognitive function and mood"
  },
  {
    id: 2,
    title: "Sleep Architecture",
    tip: "Quality sleep cycles through 4 stages every 90 minutes. Keep your room at 18-20°C for optimal deep sleep. Avoid blue light 2 hours before bed - it suppresses melatonin by up to 50%.",
    icon: Moon,
    gradient: "from-indigo-400/20 to-purple-400/20",
    category: "Rest & Recovery",
    fact: "During deep sleep, your brain clears toxins through the glymphatic system"
  },
  {
    id: 3,
    title: "Gut-Brain Connection",
    tip: "90% of serotonin is produced in your gut. Include fermented foods like curd, idli, dosa daily. Fiber from vegetables feeds beneficial bacteria - aim for 25-30g daily for optimal gut health.",
    icon: Apple,
    gradient: "from-green-400/20 to-emerald-400/20",
    category: "Nutrition Science",
    fact: "Your gut microbiome contains 100 trillion bacteria influencing mood and immunity"
  },
  {
    id: 4,
    title: "Zone 2 Cardio Benefits",
    tip: "Walking at 60-70% max heart rate (120-140 bpm) for 30 mins burns fat efficiently and builds mitochondria. Post-meal walks reduce blood sugar spikes by up to 50% - walk within 15 mins of eating.",
    icon: Footprints,
    gradient: "from-orange-400/20 to-amber-400/20",
    category: "Exercise Science",
    fact: "Just 7,000 steps daily reduces mortality risk by 50-70%"
  },
  {
    id: 5,
    title: "Heart Rate Variability",
    tip: "High HRV indicates good stress resilience. Slow breathing (5-6 breaths/min) activates parasympathetic system. Practice box breathing: 4 sec inhale, 4 sec hold, 4 sec exhale, 4 sec hold.",
    icon: Heart,
    gradient: "from-rose-400/20 to-pink-400/20",
    category: "Cardiovascular",
    fact: "Regular deep breathing can lower blood pressure by 10-15 mmHg"
  },
  {
    id: 6,
    title: "Neuroplasticity & Learning",
    tip: "Your brain forms 700 new neurons daily in the hippocampus. Challenge your brain with new skills - learning a language or instrument creates dense neural networks. 20 mins of focused learning beats hours of passive consumption.",
    icon: Brain,
    gradient: "from-violet-400/20 to-purple-400/20",
    category: "Mental Wellness",
    fact: "Neuroplasticity continues throughout life - you can rewire your brain at any age"
  },
  {
    id: 7,
    title: "Circadian Rhythm Optimization",
    tip: "Morning sunlight exposure (within 1 hour of waking) sets your master clock and boosts cortisol naturally. This improves alertness, mood, and helps you sleep better at night. 10-30 mins without sunglasses is ideal.",
    icon: Sun,
    gradient: "from-amber-400/20 to-yellow-400/20",
    category: "Daily Rhythm",
    fact: "Circadian disruption is linked to obesity, diabetes, and mental health issues"
  },
  {
    id: 8,
    title: "Phytonutrient Power",
    tip: "Turmeric's curcumin is 2000% more bioavailable with black pepper. Eat the rainbow - different colored vegetables provide unique antioxidants. Include raw ginger, garlic, and tulsi for natural anti-inflammatory benefits.",
    icon: Leaf,
    gradient: "from-teal-400/20 to-green-400/20",
    category: "Traditional Wisdom",
    fact: "Curcumin can cross the blood-brain barrier, protecting neural health"
  },
  {
    id: 9,
    title: "Metabolic Flexibility",
    tip: "Time-restricted eating (12-14 hour overnight fast) improves insulin sensitivity and triggers cellular cleanup (autophagy). Finish dinner 3 hours before sleep. This ancient practice is now backed by modern science.",
    icon: Clock,
    gradient: "from-slate-400/20 to-gray-400/20",
    category: "Metabolic Health",
    fact: "Autophagy, triggered by fasting, won the 2016 Nobel Prize in Medicine"
  },
  {
    id: 10,
    title: "Digital Eye Health",
    tip: "Follow 20-20-20 rule: Every 20 mins, look 20 feet away for 20 secs. Blue light from screens reaches deep into the eye. Position screens at arm's length and slightly below eye level to reduce strain.",
    icon: Eye,
    gradient: "from-sky-400/20 to-blue-400/20",
    category: "Modern Wellness",
    fact: "Blinking rate drops from 15 to 5 times/min when viewing screens"
  },
  {
    id: 11,
    title: "Mitochondrial Health",
    tip: "Cold exposure (cold showers for 30-60 secs) increases mitochondrial density and brown fat. This boosts metabolism and improves stress resilience. Start with 15 secs and gradually increase tolerance.",
    icon: Zap,
    gradient: "from-cyan-400/20 to-teal-400/20",
    category: "Biohacking",
    fact: "Brown fat burns calories to generate heat - activated by cold exposure"
  },
  {
    id: 12,
    title: "Immune System Priming",
    tip: "70% of immune cells reside in your gut. Vitamin D levels above 40 ng/mL reduce infection risk by 50%. Include zinc-rich foods (pumpkin seeds, chickpeas) and vitamin C (amla, citrus) for optimal immunity.",
    icon: Shield,
    gradient: "from-emerald-400/20 to-green-400/20",
    category: "Immunity",
    fact: "Just 15 mins of morning sun provides 10,000-20,000 IU of Vitamin D"
  },
  {
    id: 13,
    title: "Stress Adaptation",
    tip: "Short-term stress (exercise, cold) builds resilience through hormesis. Chronic stress raises cortisol, harming memory and immunity. Practice 'physiological sigh': 2 quick inhales through nose, long exhale through mouth.",
    icon: Activity,
    gradient: "from-red-400/20 to-orange-400/20",
    category: "Stress Science",
    fact: "The physiological sigh is the fastest way to calm your nervous system"
  },
  {
    id: 14,
    title: "Social Connection & Longevity",
    tip: "Strong social bonds reduce mortality risk more than exercise or diet. Loneliness increases inflammation markers. Schedule regular family time, join community groups - relationships are medicine for the soul.",
    icon: Smile,
    gradient: "from-pink-400/20 to-rose-400/20",
    category: "Emotional Health",
    fact: "Social isolation increases dementia risk by 50%"
  },
  {
    id: 15,
    title: "Latest Research Insight",
    tip: "2024 studies show that just 11 minutes of brisk walking daily reduces early death risk by 23%. Time in nature ('forest bathing') lowers cortisol and blood pressure. Even houseplants improve air quality and mental wellbeing.",
    icon: Sparkles,
    gradient: "from-purple-400/20 to-pink-400/20",
    category: "New Discovery",
    fact: "Nature exposure reduces rumination - repetitive negative thinking"
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
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{currentTip.title}</h3>
                  <Badge variant="outline" className="text-xs bg-background/60 border-primary/30 text-primary">
                    {currentTip.category}
                  </Badge>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">{currentTip.tip}</p>
                <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-primary/10">
                  <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic">
                    <span className="font-medium text-accent">Did you know?</span> {currentTip.fact}
                  </p>
                </div>
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
        🧬 Tip {currentIndex + 1} of {healthTips.length} • Science-backed wellness insights • Auto-advances every 5s
      </p>
    </div>
  );
}