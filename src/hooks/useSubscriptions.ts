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
    }: {
      userId: string;
      status: SubscriptionStatus;
      expiresAt: string | null;
    }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status,
          expires_at: expiresAt,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subscriptionsKey }),
  });
}
