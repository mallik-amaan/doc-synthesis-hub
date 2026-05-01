import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  isGoogleConnected: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  getAPIKey: (userID: string) => Promise<string>;
  connectGoogleDrive: () => Promise<void>;
  checkGoogleStatus: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    // Restore session from localStorage synchronously — no network call.
    // Token validity is enforced lazily: API calls return 401 when expired,
    // at which point the caller should refresh or redirect to login.
    const storedUser = localStorage.getItem('fyp_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser?.access_token && parsedUser?.id) {
          setUser(parsedUser);
        } else {
          localStorage.removeItem('fyp_user');
        }
      } catch {
        localStorage.removeItem('fyp_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Helper to resolve backend URL from env like before
  const getBackendUrl = () => {
    const processEnv =
      typeof globalThis !== 'undefined' && 'process' in globalThis
        ? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        : undefined;

    const fromProcess = processEnv
      ? processEnv.REACT_APP_BACKEND_URL || processEnv.BACKEND_URL
      : undefined;

    const fromImportMeta =
      typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_BACKEND_URL : undefined;

    const url = fromProcess || fromImportMeta || 'http://localhost:3000';
    return String(url).replace(/(^"|"$)/g, '');
  };

  // Validate if access token is still valid
  const validateToken = async (accessToken: string, userId: string): Promise<boolean> => {
    if (!accessToken || !userId) return false;

    try {
      const BACKEND_URL = getBackendUrl();
      const res = await fetch(`${BACKEND_URL}/auth/validate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ user_id: userId }),
      });

      return res.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Refresh access token using refresh token
  const refreshAccessToken = async (refreshToken: string, userId: string): Promise<User | null> => {
    if (!refreshToken || !userId) return null;

    try {
      const BACKEND_URL = getBackendUrl();
      const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          refresh_token: refreshToken,
          user_id: userId 
        }),
      });

      if (!res.ok) return null;

      const data = await res.json().catch(() => null);
      if (!data || !data.access_token) return null;

      // Create updated user object with new tokens
      const currentUser = JSON.parse(localStorage.getItem('fyp_user') || '{}');
      const updatedUser: User = {
        ...currentUser,
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
      };

      return updatedUser;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  };
    const connectGoogleDrive = async () => {
      if (!user) throw new Error('User not authenticated');
      const BACKEND_URL = getBackendUrl();
      const redirectAfterAuth = window.location.origin + "/settings";

      const res = await fetch(
        `${BACKEND_URL}/oauth/google?redirect=${encodeURIComponent(redirectAfterAuth)}&userId=${encodeURIComponent(user.id)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );

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

    const checkGoogleStatusForUser = async (targetUser: User) => {
      console.log('[checkGoogleStatus] called with user id:', targetUser?.id, 'has token:', !!targetUser?.access_token);
      if (!targetUser?.access_token) return;
      try {
        const BACKEND_URL = getBackendUrl();
        let currentUser = targetUser;
        let res = await fetch(`${BACKEND_URL}/oauth/google/status`, {
          headers: { 'Authorization': `Bearer ${currentUser.access_token}` },
        });
        console.log('[checkGoogleStatus] response status:', res.status);

        // Access token expired — try refresh once before giving up
        if ((res.status === 401 || res.status === 403) && currentUser.refresh_token) {
          console.log('[checkGoogleStatus] token expired, attempting refresh');
          const refreshed = await refreshAccessToken(currentUser.refresh_token, currentUser.id);
          if (refreshed) {
            setUser(refreshed);
            localStorage.setItem('fyp_user', JSON.stringify(refreshed));
            currentUser = refreshed;
            res = await fetch(`${BACKEND_URL}/oauth/google/status`, {
              headers: { 'Authorization': `Bearer ${currentUser.access_token}` },
            });
            console.log('[checkGoogleStatus] retry response status:', res.status);
          }
        }

        if (res.ok) {
          const data = await res.json();
          console.log('[checkGoogleStatus] connected:', data.connected);
          setIsGoogleConnected(data.connected === true);
        }
      } catch (e) {
        console.error('[checkGoogleStatus] error:', e);
      }
    };

    const checkGoogleStatus = async () => {
      if (user) await checkGoogleStatusForUser(user);
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

    // Normalize server "result" (it may be boolean or string)
    const result = data?.result;
    const success = result === true;

    if (!success) {
      const msg = data?.message || 'Login failed';
      const err: any = new Error(msg);
      err.status = 401;
      throw err;
    }

    const returnedUser = data.user || data || null;
    const finalUser: User = returnedUser && returnedUser.email
      ? { 
          id: returnedUser.id ?? '0', 
          email: returnedUser.email, 
          name: returnedUser.username ?? returnedUser.email.split('@')[0], 
          access_token: returnedUser.access_token || returnedUser.access || "", 
          refresh_token: returnedUser.refresh_token || returnedUser.refresh || "" 
        }
      : { 
          id: '0', 
          email, 
          name: email.split('@')[0], 
          access_token: "", 
          refresh_token: "" 
        };

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

  const getAPIKey = async (userID: string): Promise<string> => {
    if (!userID) {
      throw new Error('userID is null');
    }

    if (!user?.access_token) {
      throw new Error('User not authenticated');
    }

    const BACKEND_URL = getBackendUrl();
    const res = await fetch(`${BACKEND_URL}/auth/${userID}/get-api-key?id=${encodeURIComponent(userID)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(text || 'Failed to get API key');
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    const result = data?.result;

    if (result && data?.apiKey) {
      return String(data.apiKey);
    }

    throw new Error(data?.message || 'API key not available');
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    if (!user?.access_token) {
      throw new Error('User not authenticated');
    }

    const BACKEND_URL = getBackendUrl();
    const res = await fetch(`${BACKEND_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.access_token}`
      },
      body: JSON.stringify({ 
        id: user.id,
        oldPassword: currentPassword,
        newPassword: newPassword
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(text || 'Failed to change password');
      err.status = res.status;
      throw err;
    }

    const data = await res.json().catch(() => ({}));
    const result = data?.result;
    const success = result === true;

    if (!success) {
      const msg = data?.message || 'Password change failed';
      const err: any = new Error(msg);
      err.status = 400;
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fyp_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isGoogleConnected, login, signup, logout, getAPIKey, connectGoogleDrive, checkGoogleStatus, changePassword }}>
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
