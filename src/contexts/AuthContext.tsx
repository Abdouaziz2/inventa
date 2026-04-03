import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Database, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { buildManagedLoginEmail, isEmailIdentifier, usernameFromManagedLoginEmail } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';

export type AppRole = 'super_admin' | 'admin';
type LoginLogInsert = TablesInsert<'login_logs'>;
type Profile = Database['public']['Functions']['get_my_profile']['Returns'][number];
type RoleRow = Database['public']['Functions']['get_my_roles']['Returns'][number];

export interface AppUser {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: AppRole;
  mustChangePassword: boolean;
  companyId: string | null;
}

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

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

async function logLogin(email: string, status: string, userId?: string) {
  const payload: LoginLogInsert = {
    email,
    status,
    user_id: userId || null,
  };
  await supabase.from('login_logs').insert(payload);
}

async function fetchUserProfile(supabaseUser: SupabaseUser): Promise<AppUser | null> {
  const { data: profiles } = await supabase.rpc('get_my_profile');
  const profile = profiles?.[0] as Profile | undefined;
  if (!profile) return null;

  const { data: roles } = await supabase.rpc('get_my_roles');
  const role = (roles?.[0] as RoleRow | undefined)?.role === 'super_admin' ? 'super_admin' : 'admin';
  const username = typeof supabaseUser.user_metadata?.username === 'string'
    ? supabaseUser.user_metadata.username
    : usernameFromManagedLoginEmail(supabaseUser.email);

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username,
    fullName: profile.full_name,
    role,
    mustChangePassword: profile.must_change_password,
    companyId: profile.company_id,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

  const login = async (identifier: string, password: string): Promise<{ error?: string }> => {
    try {
      const trimmedIdentifier = identifier.trim();
      const loginEmail = isEmailIdentifier(trimmedIdentifier)
        ? trimmedIdentifier.toLowerCase()
        : buildManagedLoginEmail(trimmedIdentifier);

      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          await logLogin(trimmedIdentifier, 'failed_credentials');
          return { error: 'Identifiant ou mot de passe incorrect' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Compte non confirmé' };
        }
        if (error.message.includes('Signups not allowed')) {
          await logLogin(trimmedIdentifier, 'account_not_found');
          return { error: 'Compte introuvable. Seul l\'administrateur peut créer des comptes.' };
        }
        return { error: error.message };
      }

      if (!data.user) {
        return { error: 'Compte introuvable' };
      }

      const appUser = await fetchUserProfile(data.user);
      if (!appUser) {
        await supabase.auth.signOut();
        await logLogin(trimmedIdentifier, 'account_not_found', data.user.id);
        return { error: 'Profil introuvable. Contactez l\'administrateur.' };
      }

      // Check profile status
      const { data: profileData } = await supabase.rpc('get_my_profile');
      const profile = profileData?.[0] as Profile | undefined;

      if (profile?.status === 'inactive' || profile?.status === 'suspended') {
        await supabase.auth.signOut();
        await logLogin(trimmedIdentifier, 'account_inactive', data.user.id);
        return { error: 'Compte désactivé. Contactez l\'administrateur.' };
      }

      // Check if locked
      if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
        await supabase.auth.signOut();
        await logLogin(trimmedIdentifier, 'account_locked', data.user.id);
        const mins = Math.ceil((new Date(profile.locked_until).getTime() - Date.now()) / 60000);
        return { error: `Compte verrouillé. Réessayez dans ${mins} minute(s).` };
      }

      // Reset failed attempts on successful login
      if (profile?.failed_login_attempts > 0) {
        const payload: TablesUpdate<'profiles'> = {
          failed_login_attempts: 0,
          locked_until: null
        };
        await supabase.from('profiles').update(payload).eq('id', data.user.id);
      }

      await logLogin(trimmedIdentifier, 'success', data.user.id);
      setUser(appUser);
      return {};
    } catch (error: unknown) {
      return { error: getErrorMessage(error, 'Erreur de connexion') };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const changePassword = async (newPassword: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    if (user) {
      const payload: TablesUpdate<'profiles'> = { must_change_password: false };
      await supabase.from('profiles').update(payload).eq('id', user.id);
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
