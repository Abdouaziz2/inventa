import { useAuth } from '@/contexts/AuthContext';
import { getBusinessConfig, normalizeBusinessType } from '@/lib/business';

export function useBusiness() {
  const { user } = useAuth();
  const type = normalizeBusinessType(user?.businessType);
  return {
    type,
    config: getBusinessConfig(type),
    isDemo: !!user?.isDemo,
  };
}
