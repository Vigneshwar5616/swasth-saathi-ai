import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Palette, 
  HelpCircle,
  Mail,
  Phone,
  Camera,
  Check,
  Loader2,
  LogOut
} from "lucide-react";

interface Profile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
}

interface UserSettings {
  preferred_language: string;
  voice_enabled: boolean;
  theme: string;
  email_notifications: boolean;
  push_notifications: boolean;
  health_reminders: boolean;
  weekly_summary: boolean;
  data_collection: boolean;
  share_analytics: boolean;
}

interface BillingInfo {
  plan: string;
  card_last_four: string | null;
  card_brand: string | null;
  billing_email: string | null;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: null,
    avatar_url: null,
  });
  
  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    preferred_language: "en",
    voice_enabled: true,
    theme: "system",
    email_notifications: true,
    push_notifications: true,
    health_reminders: true,
    weekly_summary: false,
    data_collection: true,
    share_analytics: false,
  });
  
  // Billing state
  const [billing, setBilling] = useState<BillingInfo>({
    plan: "free",
    card_last_four: null,
    card_brand: null,
    billing_email: null,
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Load user data
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          email: profileData.email || user.email || "",
          phone: profileData.phone || "",
          date_of_birth: profileData.date_of_birth,
          avatar_url: profileData.avatar_url,
        });
      }
      
      // Load settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (settingsData) {
        setSettings({
          preferred_language: settingsData.preferred_language || "en",
          voice_enabled: settingsData.voice_enabled ?? true,
          theme: settingsData.theme || "system",
          email_notifications: settingsData.email_notifications ?? true,
          push_notifications: settingsData.push_notifications ?? true,
          health_reminders: settingsData.health_reminders ?? true,
          weekly_summary: settingsData.weekly_summary ?? false,
          data_collection: settingsData.data_collection ?? true,
          share_analytics: settingsData.share_analytics ?? false,
        });
      }
      
      // Load billing
      const { data: billingData } = await supabase
        .from("billing_info")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (billingData) {
        setBilling({
          plan: billingData.plan || "free",
          card_last_four: billingData.card_last_four,
          card_brand: billingData.card_brand,
          billing_email: billingData.billing_email,
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          date_of_birth: profile.date_of_birth,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          preferred_language: settings.preferred_language,
          voice_enabled: settings.voice_enabled,
          theme: settings.theme,
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications,
          health_reminders: settings.health_reminders,
          weekly_summary: settings.weekly_summary,
          data_collection: settings.data_collection,
          share_analytics: settings.share_analytics,
        })
        .eq("user_id", user.id);
      
      if (error) throw error;
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        
        <main className="flex-1 container mx-auto p-6">
          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details and profile picture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      value={profile.full_name || ""} 
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </div>
                    </Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={profile.email || ""} 
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </div>
                    </Label>
                    <Input 
                      id="phone" 
                      value={profile.phone || ""} 
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="destructive" size="sm">Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Manage your subscription and billing details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg capitalize">{billing.plan} Plan</h3>
                          <Badge variant="secondary">Current</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {billing.plan === "free" ? "Basic health assistant features" : "Premium features"}
                        </p>
                      </div>
                    </div>
                    <Button>Upgrade Plan</Button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">Pro Plan</CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">₹299</span>/month
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited queries</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Health reports</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Family accounts</li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2 hover:border-primary transition-colors cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">Enterprise</CardTitle>
                        <CardDescription>
                          <span className="text-2xl font-bold text-foreground">Custom</span> pricing
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All Pro features</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> API access</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Custom integrations</li>
                          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Dedicated support</li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Add or manage your payment methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billing.card_last_four ? (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-14 rounded bg-muted flex items-center justify-center text-xs font-bold">
                          {billing.card_brand?.toUpperCase() || "CARD"}
                        </div>
                        <div>
                          <p className="font-medium">•••• •••• •••• {billing.card_last_four}</p>
                          <p className="text-sm text-muted-foreground">Expires 12/26</p>
                        </div>
                      </div>
                      <Badge variant="outline">Default</Badge>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p>No payment method on file</p>
                    </div>
                  )}
                  <Button variant="outline" className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch 
                      checked={settings.email_notifications} 
                      onCheckedChange={(v) => setSettings({ ...settings, email_notifications: v })} 
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Get push notifications for updates</p>
                    </div>
                    <Switch 
                      checked={settings.push_notifications} 
                      onCheckedChange={(v) => setSettings({ ...settings, push_notifications: v })} 
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Health Reminders</Label>
                      <p className="text-sm text-muted-foreground">Important health advisories and alerts</p>
                    </div>
                    <Switch 
                      checked={settings.health_reminders} 
                      onCheckedChange={(v) => setSettings({ ...settings, health_reminders: v })} 
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Weekly Health Summary</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of health tips and insights</p>
                    </div>
                    <Switch 
                      checked={settings.weekly_summary} 
                      onCheckedChange={(v) => setSettings({ ...settings, weekly_summary: v })} 
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control your data and privacy preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Data Collection</Label>
                      <p className="text-sm text-muted-foreground">Allow collection of usage data to improve services</p>
                    </div>
                    <Switch 
                      checked={settings.data_collection} 
                      onCheckedChange={(v) => setSettings({ ...settings, data_collection: v })} 
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Share Analytics</Label>
                      <p className="text-sm text-muted-foreground">Share anonymized data for research purposes</p>
                    </div>
                    <Switch 
                      checked={settings.share_analytics} 
                      onCheckedChange={(v) => setSettings({ ...settings, share_analytics: v })} 
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Your Data</CardTitle>
                  <CardDescription>Download or delete your personal data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Download Data</p>
                      <p className="text-sm text-muted-foreground">Get a copy of all your data</p>
                    </div>
                    <Button variant="outline" size="sm">Download</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={settings.theme} onValueChange={(v) => setSettings({ ...settings, theme: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={settings.preferred_language} onValueChange={(v) => setSettings({ ...settings, preferred_language: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="kn">Kannada</SelectItem>
                        <SelectItem value="ml">Malayalam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Voice Responses</Label>
                      <p className="text-sm text-muted-foreground">Enable text-to-speech for AI responses</p>
                    </div>
                    <Switch 
                      checked={settings.voice_enabled} 
                      onCheckedChange={(v) => setSettings({ ...settings, voice_enabled: v })} 
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Help Tab */}
            <TabsContent value="help" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Help & Support</CardTitle>
                  <CardDescription>Get help with using Aarogyasri</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">FAQs</p>
                        <p className="text-sm text-muted-foreground">Frequently asked questions</p>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">Contact Support</p>
                        <p className="text-sm text-muted-foreground">Get help from our team</p>
                      </div>
                      <Button variant="ghost" size="sm">Contact</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div>
                        <p className="font-medium">Documentation</p>
                        <p className="text-sm text-muted-foreground">Learn how to use features</p>
                      </div>
                      <Button variant="ghost" size="sm">Read</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Aarogyasri - Your AI Health Assistant</p>
                  <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Settings;
