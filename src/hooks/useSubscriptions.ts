import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { SubscriptionStatus } from '@/types/api';

export type SubscriptionAdminRow = {
  user_id: string;
  email: string;
  plan_code: string;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string | null;
  updated_at: string;
};

const subscriptionsKey = ['subscriptions'] as const;

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id, email, plan_code, status, starts_at, expires_at, updated_at')
        .order('email');

      if (error) throw error;
      return data as SubscriptionAdminRow[];
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status,
      expiresAt,
      renewFromCurrent = false,
    }: {
      userId: string;
      status: SubscriptionStatus;
      expiresAt: string | null;
      renewFromCurrent?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-update-subscription', {
        body: { userId, status, expiresAt, renewFromCurrent },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionsKey }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionsKey }),
  });
}
