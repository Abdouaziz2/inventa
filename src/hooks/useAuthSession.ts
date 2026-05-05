import { useAuth } from '@/contexts/AuthContext';

export function useAuthSession() {
  return useAuth();
}
