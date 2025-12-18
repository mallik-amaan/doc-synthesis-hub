import { error } from 'console';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  connectGoogleDrive: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('fyp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Helper to resolve backend URL from env like before
  const getBackendUrl = () => {
    const fromProcess =
      typeof process !== 'undefined' && process.env
        ? process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL
        : undefined;

    const fromImportMeta =
      typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_BACKEND_URL : undefined;

    const url = fromProcess || fromImportMeta || 'http://localhost:3000';
    return String(url).replace(/(^"|"$)/g, '');
  };
    const connectGoogleDrive = async () => {
      const BACKEND_URL = getBackendUrl();
      const redirectAfterAuth = window.location.origin + "/settings";

      const res = await fetch(`${BACKEND_URL}/oauth/google?redirect=${encodeURIComponent(redirectAfterAuth)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({
        //   user_id:user.id,
        // })
      });

      // If backend returns JSON with a redirect URL, use it
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        const url = data?.url || data?.redirect || data?.location;
        if (url) {
          window.location.href = url;
          return;
        }
      }
      throw new Error('Redirect URL not available from backend response');
    };

    const checkGoogleStatus = async () => {
      const BACKEND_URL = getBackendUrl();

      const res = await fetch(`${BACKEND_URL}/oauth/google/status`, {
        credentials: "include",
      });

      const data = await res.json();
      if (data.connected) {
        console.log("Google Drive is connected");
      }
    };

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const BACKEND_URL = getBackendUrl();
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(text || res.statusText);
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    console.log(data);

    // Normalize server "result" (it may be boolean or string)
    const result = data?.result;
    const success =
      result === true

    if (!success) {
      const msg = data?.message || 'Login failed';
      const err: any = new Error(msg);
      // set a status so callers can distinguish (e.g. 401)
      err.status = 401;
      throw err;
    }

    const returnedUser = data.user || data || null;
    const finalUser: User = returnedUser && returnedUser.email
      ? { id: returnedUser.id ?? '0', email: returnedUser.email, name: returnedUser.username ?? returnedUser.email.split('@')[0], access_token: returnedUser.access, refresh_token: returnedUser.refresh }
      : { id: '0', email, name: email.split('@')[0], access_token: "", refresh_token: "" };
    console.log(finalUser)
    setUser(finalUser);
    localStorage.setItem('fyp_user', JSON.stringify(finalUser));
  };

  const signup = async (username: string, email: string, password: string) => {
    if (!username || !email || !password) {
      throw new Error('All fields are required');
    }

    const BACKEND_URL = getBackendUrl();
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(text || res.statusText);
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    const result = data?.result;
    const success =
      result === true

    if (!success) {
      const msg = data?.message || 'Login failed';
      const err: any = new Error(msg);
      // set a status so callers can distinguish (e.g. 401)
      err.status = 401;
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fyp_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, connectGoogleDrive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
