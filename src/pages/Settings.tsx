import { useState } from "react";
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
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Globe, 
  Palette, 
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Camera,
  Check,
  ChevronRight
} from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  
  // Account settings state
  const [firstName, setFirstName] = useState("Ravi");
  const [lastName, setLastName] = useState("Kumar");
  const [email, setEmail] = useState("ravi.kumar@example.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [location, setLocation] = useState("Hyderabad, India");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [appointmentReminders, setAppointmentReminders] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  
  // Privacy settings
  const [shareData, setShareData] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [saveHistory, setSaveHistory] = useState(true);
  
  // Appearance settings
  const [language, setLanguage] = useState("en-IN");
  const [theme, setTheme] = useState("system");

  const handleSaveAccount = () => {
    toast({
      title: "Account updated",
      description: "Your account information has been saved successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notifications updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
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
                      <AvatarImage src="" />
                      <AvatarFallback className="text-lg bg-primary text-primary-foreground">RK</AvatarFallback>
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
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
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
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </div>
                      </Label>
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </div>
                      </Label>
                      <Input 
                        id="location" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={handleSaveAccount}>Save Changes</Button>
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
                          <h3 className="font-semibold text-lg">Free Plan</h3>
                          <Badge variant="secondary">Current</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Basic health assistant features</p>
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
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-14 rounded bg-muted flex items-center justify-center text-xs font-bold">VISA</div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/26</p>
                      </div>
                    </div>
                    <Badge variant="outline">Default</Badge>
                  </div>
                  <Button variant="outline" className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View and download your invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No billing history yet</p>
                    <p className="text-sm">Your invoices will appear here after your first payment</p>
                  </div>
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
                    <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Get text messages for important updates</p>
                    </div>
                    <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Health Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important health advisories and alerts</p>
                    </div>
                    <Switch checked={healthAlerts} onCheckedChange={setHealthAlerts} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Appointment Reminders</Label>
                      <p className="text-sm text-muted-foreground">Reminders for upcoming medical appointments</p>
                    </div>
                    <Switch checked={appointmentReminders} onCheckedChange={setAppointmentReminders} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Weekly Health Digest</Label>
                      <p className="text-sm text-muted-foreground">Weekly summary of health tips and insights</p>
                    </div>
                    <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Security</CardTitle>
                  <CardDescription>Manage your privacy settings and account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                    </div>
                    <Switch checked={twoFactorAuth} onCheckedChange={setTwoFactorAuth} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Save Chat History</Label>
                      <p className="text-sm text-muted-foreground">Keep a record of your health conversations</p>
                    </div>
                    <Switch checked={saveHistory} onCheckedChange={setSaveHistory} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Share Anonymous Data</Label>
                      <p className="text-sm text-muted-foreground">Help improve the service with anonymous usage data</p>
                    </div>
                    <Switch checked={shareData} onCheckedChange={setShareData} />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>Control your personal data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Download Your Data</p>
                      <p className="text-sm text-muted-foreground">Get a copy of all your data</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Download
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Clear Chat History</p>
                      <p className="text-sm text-muted-foreground">Delete all your conversation history</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Clear
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                  <CardDescription>Set your preferred language and regional settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Display Language
                      </div>
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-IN">English (India)</SelectItem>
                        <SelectItem value="hi-IN">हिंदी (Hindi)</SelectItem>
                        <SelectItem value="te-IN">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="ta-IN">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="kn-IN">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="ml-IN">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="mr-IN">मराठी (Marathi)</SelectItem>
                        <SelectItem value="bn-IN">বাংলা (Bengali)</SelectItem>
                        <SelectItem value="gu-IN">ગુજરાતી (Gujarati)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Customize the appearance of the application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'light' ? 'border-primary' : 'border-muted'}`}
                      onClick={() => setTheme('light')}
                    >
                      <div className="h-20 rounded bg-white border mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gray-200" />
                      </div>
                      <p className="font-medium text-center">Light</p>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'border-primary' : 'border-muted'}`}
                      onClick={() => setTheme('dark')}
                    >
                      <div className="h-20 rounded bg-gray-900 border mb-3 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gray-700" />
                      </div>
                      <p className="font-medium text-center">Dark</p>
                    </div>
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'system' ? 'border-primary' : 'border-muted'}`}
                      onClick={() => setTheme('system')}
                    >
                      <div className="h-20 rounded border mb-3 flex overflow-hidden">
                        <div className="w-1/2 bg-white flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-gray-200" />
                        </div>
                        <div className="w-1/2 bg-gray-900 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-gray-700" />
                        </div>
                      </div>
                      <p className="font-medium text-center">System</p>
                    </div>
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
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <HelpCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">FAQs</p>
                        <p className="text-sm text-muted-foreground">Find answers to common questions</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Contact Support</p>
                        <p className="text-sm text-muted-foreground">Get help from our support team</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Privacy Policy</p>
                        <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Terms of Service</p>
                        <p className="text-sm text-muted-foreground">Read our terms and conditions</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>About Aarogyasri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                      <span className="text-2xl text-primary-foreground font-bold">A</span>
                    </div>
                    <h3 className="font-semibold text-lg">Aarogyasri</h3>
                    <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                    <p className="text-sm text-muted-foreground">Your AI-powered health assistant for India</p>
                  </div>
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
