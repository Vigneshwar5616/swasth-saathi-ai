import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAppRedirectUrl } from "@/lib/authRedirect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Heart, Loader2, Mail, Lock, User, CheckCircle2, ArrowLeft } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

// Session storage keys
const PENDING_CONFIRMATION_KEY = "aarogyasri_pending_confirmation";
const LAST_RESEND_KEY = "aarogyasri_last_resend";

interface PendingConfirmation {
  email: string;
  timestamp: number;
}

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showConfirmationPending, setShowConfirmationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [activeTab, setActiveTab] = useState("signin");

  // Check for pending confirmation on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(PENDING_CONFIRMATION_KEY);
    if (stored) {
      try {
        const data: PendingConfirmation = JSON.parse(stored);
        // Only show if within last 30 minutes
        if (Date.now() - data.timestamp < 30 * 60 * 1000) {
          setPendingEmail(data.email);
          setEmail(data.email);
          setShowConfirmationPending(true);
        } else {
          sessionStorage.removeItem(PENDING_CONFIRMATION_KEY);
        }
      } catch {
        sessionStorage.removeItem(PENDING_CONFIRMATION_KEY);
      }
    }
    
    // Check resend cooldown
    const lastResend = sessionStorage.getItem(LAST_RESEND_KEY);
    if (lastResend) {
      const elapsed = Math.floor((Date.now() - parseInt(lastResend, 10)) / 1000);
      if (elapsed < 60) {
        setResendCooldown(60 - elapsed);
      }
    }
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Clear pending confirmation when logged in
      sessionStorage.removeItem(PENDING_CONFIRMATION_KEY);
      navigate("/");
    }
  }, [user, navigate]);

  const validateForm = useCallback(() => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const storePendingConfirmation = (email: string) => {
    const data: PendingConfirmation = { email, timestamp: Date.now() };
    sessionStorage.setItem(PENDING_CONFIRMATION_KEY, JSON.stringify(data));
    setPendingEmail(email);
    setShowConfirmationPending(true);
  };

  const clearPendingConfirmation = () => {
    sessionStorage.removeItem(PENDING_CONFIRMATION_KEY);
    setPendingEmail("");
    setShowConfirmationPending(false);
  };

  const isNetworkIssue = (message?: string) => {
    const normalized = String(message || "").toLowerCase();
    return normalized.includes("failed to fetch") || normalized.includes("networkerror") || normalized.includes("network");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    const { error } = await signIn(email, password, rememberMe);
    setLoading(false);
    
    if (error) {
      const isPendingEmail = pendingEmail && email.toLowerCase() === pendingEmail.toLowerCase();
      
      if (isNetworkIssue(error.message)) {
        toast({ 
          title: "Connection error", 
          description: "Unable to reach the server. Please check your internet connection and try again.",
          variant: "destructive" 
        });
      } else if (error.message?.includes("Email not confirmed")) {
        storePendingConfirmation(email);
        toast({ 
          title: "Please confirm your email first", 
          description: "Check your inbox for the confirmation link.",
          variant: "destructive" 
        });
        return;
      } else if (error.message?.includes("Invalid login credentials")) {
        if (isPendingEmail) {
          setShowConfirmationPending(true);
          toast({ 
            title: "Please confirm your email first", 
            description: "Check your inbox for the confirmation link before signing in.",
            variant: "destructive" 
          });
          return;
        }
        toast({ 
          title: "Sign in failed", 
          description: "Invalid email or password. Please check your credentials.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Sign in failed", 
          description: error.message || "Please try again.", 
          variant: "destructive" 
        });
      }
    } else {
      clearPendingConfirmation();
      toast({ title: "Welcome back!", description: "You have successfully signed in." });
    }
  };

  const handleResendConfirmation = async () => {
    const targetEmail = pendingEmail || email;
    if (!targetEmail) {
      toast({ title: "Enter your email", description: "Please enter your email address first.", variant: "destructive" });
      return;
    }
    
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: getAppRedirectUrl("/"),
      },
    });
    setResendLoading(false);
    
    if (error) {
      toast({ 
        title: "Failed to resend", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      sessionStorage.setItem(LAST_RESEND_KEY, Date.now().toString());
      setResendCooldown(60);
      toast({ 
        title: "Confirmation email sent!", 
        description: `Check your inbox at ${targetEmail}` 
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    const { error, session } = await signUp(email, password, fullName);
    setLoading(false);
    
    if (error) {
      if (isNetworkIssue(error.message)) {
        // Network may fail after backend already accepted signup. Move user to confirmation flow.
        storePendingConfirmation(email);
        toast({ 
          title: "Connection unstable", 
          description: "Your account request may still be processed. Check your email, then use Resend if needed.",
        });
        return;
      }

      let message = "Failed to create account. Please try again.";
      if (error.message?.includes("already registered")) {
        message = "This email is already registered. Please sign in instead.";
        setActiveTab("signin");
      }
      toast({ title: "Sign up failed", description: message, variant: "destructive" });
    } else if (session) {
      // Auto-signed in (email confirmation disabled)
      toast({ 
        title: "Welcome!", 
        description: "Your account has been created and you're now signed in." 
      });
      navigate("/");
    } else {
      // Email confirmation required
      storePendingConfirmation(email);
      sessionStorage.setItem(LAST_RESEND_KEY, Date.now().toString());
      setResendCooldown(60);
      toast({ 
        title: "Account created!", 
        description: "Check your email to confirm your account." 
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    
    setResetLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAppRedirectUrl("/reset-password"),
    });
    
    setResetLoading(false);
    
    if (error) {
      toast({
        title: "Failed to send reset email",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reset email sent!",
        description: "Check your inbox for the password reset link."
      });
      setShowForgotPassword(false);
    }
  };

  const handleBackToSignIn = () => {
    setShowConfirmationPending(false);
    setActiveTab("signin");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Confirmation pending view
  if (showConfirmationPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Check Your Email</h1>
            <p className="text-muted-foreground">Confirm your account to continue</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">We sent a confirmation link to:</p>
                  <p className="text-primary font-semibold">{pendingEmail}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the link in your email to verify your account, then come back here to sign in.
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleResendConfirmation}
                  variant="outline"
                  className="w-full"
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Confirmation Email"}
                </Button>
                
                <Button 
                  onClick={handleBackToSignIn}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Already confirmed? <button onClick={handleBackToSignIn} className="text-primary hover:underline">Sign in here</button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Forgot password view
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Heart className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Aarogyasri</h1>
            <p className="text-muted-foreground">Reset Your Password</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a reset link
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Aarogyasri</h1>
          <p className="text-muted-foreground">Your AI Health Assistant</p>
        </div>

        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="signin" className="space-y-4">
                <CardDescription className="text-center">
                  Sign in to save your health conversations and settings
                </CardDescription>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label 
                      htmlFor="remember-me" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <CardDescription className="text-center">
                  Create an account to get personalized health assistance
                </CardDescription>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
        
        <p className="text-xs text-center text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
