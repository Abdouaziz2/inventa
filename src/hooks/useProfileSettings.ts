import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, TablesUpdate } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Functions']['get_my_profile']['Returns'][number];

export type ProfileSettings = ProfileRow & {
  business_name: string;
  address: string;
  logo: string;
  secondary_phone: string;
};

export const useProfileSettings = () =>
  useQuery({
    queryKey: ['profile-settings'],
    queryFn: async (): Promise<ProfileSettings> => {
      const { data, error } = await supabase.rpc('get_my_profile');
      if (error) throw error;

      const profile = data?.[0];
      if (!profile) {
        throw new Error('Profil introuvable');
      }

      return {
        ...profile,
        business_name: profile.business_name ?? '',
        address: profile.address ?? '',
        logo: profile.logo ?? '',
        secondary_phone: profile.secondary_phone ?? '',
      };
    },
  });

export const useUpdateProfileSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: {
      id: string;
      full_name: string;
      business_name: string;
      phone: string;
      secondary_phone: string;
      address: string;
      logo: string;
    }) => {
      const { id, ...updates } = settings;
      const payload: TablesUpdate<'profiles'> = updates;
      const { error } = await supabase.from('profiles').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-settings'] });
    },
  });
};
