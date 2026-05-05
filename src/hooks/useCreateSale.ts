import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSale, type CreateSaleInput } from '@/services/sales';

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supabase', 'jewelry', 'stock'] }),
        queryClient.invalidateQueries({ queryKey: ['supabase', 'clients'] }),
      ]);
    },
  });
}
