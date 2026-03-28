import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanySettings {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export const useCompanySettings = () => {
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address: data.address,
      };
    },
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings> & { id: string }) => {
      const { id, ...updates } = settings;
      const { error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });
};
