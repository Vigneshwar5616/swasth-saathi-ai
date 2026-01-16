// Secure credential storage utility for "Remember Me" functionality
// Uses browser's localStorage with basic obfuscation

const STORAGE_KEY = "aarogyasri_remembered_user";

interface StoredCredentials {
  email: string;
  password: string;
  timestamp: number;
}

// Simple obfuscation (not encryption - just prevents casual viewing)
const obfuscate = (str: string): string => {
  return btoa(encodeURIComponent(str).split('').reverse().join(''));
};

const deobfuscate = (str: string): string => {
  try {
    return decodeURIComponent(atob(str).split('').reverse().join(''));
  } catch {
    return '';
  }
};

export const saveCredentials = (email: string, password: string): void => {
  const data: StoredCredentials = {
    email: obfuscate(email),
    password: obfuscate(password),
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadCredentials = (): { email: string; password: string } | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: StoredCredentials = JSON.parse(stored);
    
    // Expire after 30 days
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > thirtyDays) {
      clearCredentials();
      return null;
    }
    
    return {
      email: deobfuscate(data.email),
      password: deobfuscate(data.password)
    };
  } catch {
    return null;
  }
};

export const clearCredentials = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
