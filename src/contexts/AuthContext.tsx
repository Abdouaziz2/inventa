import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AppRole = 'super_admin' | 'admin' | 'manager' | 'seller';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  changePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

async function logLogin(email: string, status: string, userId?: string) {
  await supabase.from('login_logs').insert({
    email,
    status,
    user_id: userId || null,
  } as any);
}

async function fetchUserProfile(supabaseUser: SupabaseUser): Promise<AppUser | null> {
  const { data: profiles } = await supabase.rpc('get_my_profile');
  const profile = (profiles as any)?.[0];
  if (!profile) return null;

  const { data: roles } = await supabase.rpc('get_my_roles');
  const role = (roles as any)?.[0]?.role || 'seller';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    fullName: profile.full_name,
    role,
    mustChangePassword: profile.must_change_password,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;

    // First get the current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const appUser = await fetchUserProfile(session.user);
          setUser(appUser);
        } catch (e) {
          console.error('Error fetching profile:', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      initialized = true;
    });

    // Then listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial event since getSession handles it
      if (!initialized) return;

      if (session?.user) {
        try {
          const appUser = await fetchUserProfile(session.user);
          setUser(appUser);
        } catch (e) {
          console.error('Error fetching profile:', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Check if it's invalid credentials
        if (error.message.includes('Invalid login credentials')) {
          // Try to find user and increment failed attempts via edge function
          await logLogin(email, 'failed_password');
          return { error: 'Mot de passe incorrect' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Compte non confirmé' };
        }
        if (error.message.includes('Signups not allowed')) {
          await logLogin(email, 'account_not_found');
          return { error: 'Compte introuvable' };
        }
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Compte introuvable' };
      }

      // Fetch profile to check status
      const appUser = await fetchUserProfile(data.user);
      if (!appUser) {
        await supabase.auth.signOut();
        await logLogin(email, 'account_not_found', data.user.id);
        return { error: 'Profil introuvable. Contactez l\'administrateur.' };
      }

      // Check profile status via direct query (use service-side check)
      const { data: profileData } = await supabase.rpc('get_my_profile');
      const profile = (profileData as any)?.[0];

      if (profile?.status === 'inactive' || profile?.status === 'suspended') {
        await supabase.auth.signOut();
        await logLogin(email, 'account_inactive', data.user.id);
        return { error: 'Compte désactivé. Contactez l\'administrateur.' };
      }

      // Check if locked
      if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
        await supabase.auth.signOut();
        await logLogin(email, 'account_locked', data.user.id);
        return { error: 'Compte temporairement verrouillé. Réessayez plus tard.' };
      }

      // Reset failed attempts on successful login
      if (profile?.failed_login_attempts > 0) {
        await supabase.from('profiles').update({ 
          failed_login_attempts: 0, 
          locked_until: null 
        } as any).eq('id', data.user.id);
      }

      await logLogin(email, 'success', data.user.id);
      setUser(appUser);
      return {};
    } catch (err: any) {
      return { error: 'Erreur de connexion' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const changePassword = async (newPassword: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    // Mark password as changed
    if (user) {
      await supabase.from('profiles').update({ must_change_password: false } as any).eq('id', user.id);
      setUser({ ...user, mustChangePassword: false });
    }
    return {};
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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
