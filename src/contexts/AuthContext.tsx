import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { getAppRedirectUrl } from "@/lib/authRedirect";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; session: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const didWelcomeAfterConfirmRef = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth] State changed:", event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle email confirmation redirects (hash-based implicit flow OR PKCE code flow)
        if (event === "SIGNED_IN") {
          const searchParams = new URLSearchParams(window.location.search);
          const isAuthRedirect =
            window.location.hash.includes("access_token") ||
            searchParams.has("code") ||
            searchParams.has("token") ||
            searchParams.has("token_hash") ||
            searchParams.get("type") === "signup";

          if (isAuthRedirect) {
            if (!didWelcomeAfterConfirmRef.current) {
              toast.success("Welcome to Aarogyasri!", {
                description: "Email confirmed successfully. You're signed in.",
              });
              didWelcomeAfterConfirmRef.current = true;
            }
            // Clean up the URL by removing hash + auth query params
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isNetworkError = (error: any) => {
    const message = String(error?.message || "").toLowerCase();
    return (
      error?.name === "TypeError" ||
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network")
    );
  };

  const withAuthRetry = async <T,>(operation: () => Promise<T>): Promise<T> => {
    const retryDelaysMs = [800, 1600, 3000];
    let lastError: any;

    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        if (!isNetworkError(error) || attempt === retryDelaysMs.length) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelaysMs[attempt]));
      }
    }

    throw lastError;
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    if (!rememberMe) {
      await supabase.auth.signOut();
    }
    
    try {
      const { error } = await withAuthRetry(() =>
        supabase.auth.signInWithPassword({
          email,
          password,
        })
      );
      
      if (!error && !rememberMe) {
        sessionStorage.setItem('session_only', 'true');
      } else if (!error) {
        sessionStorage.removeItem('session_only');
      }
      
      return { error };
    } catch (err: any) {
      return { error: { message: err?.message || "Failed to fetch" } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = getAppRedirectUrl("/");
    
    try {
      const { data, error } = await withAuthRetry(() =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: fullName,
            },
          },
        })
      );
      
      return { error, session: data?.session };
    } catch (err: any) {
      return { error: { message: err?.message || "Failed to fetch" }, session: null };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
