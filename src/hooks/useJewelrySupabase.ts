import { useQuery } from '@tanstack/react-query';
import { getAvailableStock } from '@/services/jewelry';

export function useJewelrySupabase() {
  return useQuery({
    queryKey: ['supabase', 'jewelry', 'stock'],
    queryFn: getAvailableStock,
  });
}
