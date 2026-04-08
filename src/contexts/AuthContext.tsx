import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, clearAuthToken, getAuthToken, setAuthToken } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type { AppUser } from '@/types/api';

export type { AppUser };
export type AppRole = AppUser['role'];

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: AppUser }>('/auth/me');
        setUser(response.user);
      } catch {
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiRequest<{ token: string; user: AppUser }>('/auth/login', {
        method: 'POST',
        auth: false,
        body: {
          identifier,
          password,
        },
      });

      setAuthToken(response.token);
      setUser(response.user);
      return {};
    } catch (error: unknown) {
      return { error: getErrorMessage(error, 'Erreur de connexion') };
    }
  };

  const logout = async () => {
    clearAuthToken();
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    try {
      const response = await apiRequest<{ user: AppUser }>('/auth/change-password', {
        method: 'POST',
        body: {
          password: newPassword,
        },
      });

      setUser(response.user);
      return {};
    } catch (error: unknown) {
      return { error: getErrorMessage(error, 'Impossible de modifier le mot de passe') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === 'super_admin',
        changePassword,
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
