import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import {
  getCurrentProfile,
  signInWithPassword,
  signOutCurrentUser,
} from '@/services/auth';
import type { AppUser } from '@/types/api';

export type { AppUser };
export type AppRole = AppUser['role'];

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  hasAccess: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getCurrentProfile();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const profile = await signInWithPassword(identifier, password);
      setUser(profile);
      return {};
    } catch (error: unknown) {
      return { error: getErrorMessage(error, 'Erreur de connexion') };
    }
  };

  const logout = async () => {
    await signOutCurrentUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        hasAccess: !!user?.hasActiveSubscription,
        isSuperAdmin: user?.role === 'super_admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
