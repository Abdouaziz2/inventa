import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getJewelryImageUrl } from '@/services/storage';
import type { ProfileSettings } from '@/types/api';

type CompanyRow = {
  name: string;
  address: string | null;
  phone: string | null;
  secondary_phone: string | null;
  logo: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  company_id: string | null;
  companies: CompanyRow | CompanyRow[] | null;
};

type ProfileSettingsUpdate = {
  id: string;
  full_name: string;
  business_name: string;
  phone: string;
  secondary_phone: string;
  address: string;
  logo: string;
};

export type { ProfileSettings };

export const useProfileSettings = () =>
  useQuery({
    queryKey: queryKeys.profileSettings,
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Utilisateur non authentifie');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at, company_id, companies(name, address, phone, secondary_phone, logo)')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const profile = data as unknown as ProfileRow;
      const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies;
      return {
        id: String(profile.id),
        company_id: profile.company_id ? String(profile.company_id) : null,
        full_name: String(profile.full_name ?? ''),
        phone: String(profile.phone ?? company?.phone ?? ''),
        status: 'active',
        business_name: String(company?.name ?? ''),
        address: String(company?.address ?? ''),
        logo: company?.logo ? await getJewelryImageUrl(company.logo) : '',
        secondary_phone: String(company?.secondary_phone ?? ''),
        created_at: String(profile.created_at),
      } as ProfileSettings;
    },
  });

export const useUpdateProfileSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...settings }: ProfileSettingsUpdate) => {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: settings.full_name,
          phone: settings.phone,
        })
        .eq('id', id)
        .select('company_id')
        .single();

      if (profileError) throw profileError;

      let companyId = profile.company_id as string | null;

      if (companyId) {
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: settings.business_name,
            phone: settings.phone,
            secondary_phone: settings.secondary_phone,
            address: settings.address,
            logo: settings.logo || null,
          })
          .eq('id', companyId);

        if (companyError) throw companyError;
      } else {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: settings.business_name || 'Ma boutique',
            phone: settings.phone,
            secondary_phone: settings.secondary_phone,
            address: settings.address,
            logo: settings.logo || null,
            created_by: id,
          })
          .select('id')
          .single();

        if (companyError) throw companyError;

        companyId = company.id;

        const { error: profileLinkError } = await supabase
          .from('profiles')
          .update({ company_id: company.id })
          .eq('id', id);

        if (profileLinkError) throw profileLinkError;
      }

      return {
        ...settings,
        company_id: companyId,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profileSettings });
    },
  });
};
