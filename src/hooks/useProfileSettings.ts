import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProfileSettings = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  company_id: string | null;
  must_change_password: boolean;
  business_name: string;
  address: string;
  logo: string;
  secondary_phone: string;
};

export const useProfileSettings = () =>
  useQuery({
    queryKey: ['profile-settings'],
    queryFn: async (): Promise<ProfileSettings> => {
      const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
      if (profileError) throw profileError;

      const profile = profileData?.[0];
      if (!profile) {
        throw new Error('Profil introuvable');
      }

      // Fetch company settings if user has a company_id
      let companySettings = { name: '', address: '', logo: '', phone: '' };
      if (profile.company_id) {
        const { data: cs } = await supabase
          .from('company_settings')
          .select('name, address, logo, phone')
          .eq('id', profile.company_id)
          .single();
        if (cs) {
          companySettings = cs;
        }
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        status: profile.status,
        company_id: profile.company_id,
        must_change_password: profile.must_change_password,
        business_name: companySettings.name ?? '',
        address: companySettings.address ?? '',
        logo: companySettings.logo ?? '',
        secondary_phone: companySettings.phone ?? '',
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
      const { id, full_name, phone, business_name, secondary_phone, address, logo } = settings;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name, phone })
        .eq('id', id);
      if (profileError) throw profileError;

      // Update company settings
      const { data: profileData } = await supabase.rpc('get_my_profile');
      const companyId = profileData?.[0]?.company_id;
      if (companyId) {
        const { error: companyError } = await supabase
          .from('company_settings')
          .update({ name: business_name, phone: secondary_phone, address, logo })
          .eq('id', companyId);
        if (companyError) throw companyError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-settings'] });
    },
  });
};
