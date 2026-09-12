import { useQuery } from '@tanstack/react-query';
import { fallbackCatalogue, type PlanCatalogue } from '@/lib/plans';
import { fetchPlanCatalogue } from '@/services/subscriptions';

export type { PlanCatalogue };

export function usePlanCatalogue() {
  return useQuery({
    queryKey: ['plan-catalogue'],
    queryFn: fetchPlanCatalogue,
    staleTime: 5 * 60 * 1000,
    placeholderData: () => fallbackCatalogue(),
  });
}