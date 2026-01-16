import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AdminContextType {
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  checkAdminAccess: (sequence: string[]) => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// Secret key sequence to activate admin mode (Konami-style)
const ADMIN_SEQUENCE = ["a", "d", "m", "i", "n", "2", "0", "2", "6"];

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [inputSequence, setInputSequence] = useState<string[]>([]);

  const checkAdminAccess = useCallback((sequence: string[]): boolean => {
    const newSequence = [...inputSequence, ...sequence].slice(-ADMIN_SEQUENCE.length);
    setInputSequence(newSequence);
    
    if (newSequence.join("") === ADMIN_SEQUENCE.join("")) {
      setIsAdminMode(true);
      setInputSequence([]);
      return true;
    }
    return false;
  }, [inputSequence]);

  const toggleAdminMode = useCallback(() => {
    setIsAdminMode(prev => !prev);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdminMode, toggleAdminMode, checkAdminAccess }}>
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
