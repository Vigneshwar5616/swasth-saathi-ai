import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  checkAdminAccess: (sequence: string[]) => boolean;
  isVerifyingRole: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [isVerifyingRole, setIsVerifyingRole] = useState(false);

  // Check if user has admin role in the database
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setHasAdminRole(false);
        setIsAdminMode(false);
        return;
      }

      setIsVerifyingRole(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setHasAdminRole(false);
          setIsAdminMode(false);
        } else {
          const isAdmin = !!data;
          setHasAdminRole(isAdmin);
          // Auto-enable admin mode if user has admin role
          if (isAdmin) {
            setIsAdminMode(true);
          } else {
            setIsAdminMode(false);
          }
        }
      } catch (err) {
        console.error("Failed to check admin role:", err);
        setHasAdminRole(false);
        setIsAdminMode(false);
      } finally {
        setIsVerifyingRole(false);
      }
    };

    checkAdminRole();
  }, [user]);

  // checkAdminAccess now only works if user has verified admin role
  const checkAdminAccess = useCallback((_sequence: string[]): boolean => {
    // Keyboard sequence is disabled - admin mode is controlled by database role only
    return hasAdminRole;
  }, [hasAdminRole]);

  const toggleAdminMode = useCallback(() => {
    // Only allow toggling if user has admin role
    if (hasAdminRole) {
      setIsAdminMode(prev => !prev);
    }
  }, [hasAdminRole]);

  return (
    <AdminContext.Provider value={{ isAdminMode, toggleAdminMode, checkAdminAccess, isVerifyingRole }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
