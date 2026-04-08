import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { ProfileSettings } from '@/types/api';

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
      const response = await apiRequest<{ profile: ProfileSettings }>('/profile');
      return response.profile;
    },
  });

export const useUpdateProfileSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id: _id, ...settings }: ProfileSettingsUpdate) => {
      const response = await apiRequest<{ profile: ProfileSettings }>('/profile', {
        method: 'PATCH',
        body: settings,
      });
      return response.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profileSettings });
    },
  });
};
