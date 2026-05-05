import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, listClients, type CreateClientInput } from '@/services/clients';

export function useClientsSupabase() {
  return useQuery({
    queryKey: ['supabase', 'clients'],
    queryFn: listClients,
  });
}

export function useCreateClientSupabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['supabase', 'clients'] });
    },
  });
}
