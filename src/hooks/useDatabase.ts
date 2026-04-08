import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type {
  Client,
  Deposit,
  DepositWithClient,
  Jewelry,
  Reservation,
  ReservationWithRelations,
  Sale,
  SaleWithRelations,
} from '@/types/api';

export type {
  Client,
  Jewelry,
  Deposit,
  Sale,
  Reservation,
  DepositWithClient,
  SaleWithRelations,
  ReservationWithRelations,
};

export type ClientSummary = Pick<Client, 'name' | 'code'>;
export type JewelrySummary = Pick<Jewelry, 'name'>;

export const useClients = () =>
  useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const response = await apiRequest<{ clients: Client[] }>('/clients');
      return response.clients;
    },
  });

export const useClient = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.client(id),
    enabled: !!id,
    queryFn: async () => {
      const response = await apiRequest<{ client: Client }>(`/clients/${id}`);
      return response.client;
    },
  });

export const useAddClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: { name: string; phone: string; email?: string }) => {
      const response = await apiRequest<{ client: Client }>('/clients', {
        method: 'POST',
        body: client,
      });
      return response.client;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients }),
  });
};

export const useUpdateClientBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      await apiRequest(`/clients/${id}/balance`, {
        method: 'PATCH',
        body: { balance },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients }),
  });
};

export const useJewelry = () =>
  useQuery({
    queryKey: queryKeys.jewelry,
    queryFn: async () => {
      const response = await apiRequest<{ jewelry: Jewelry[] }>('/jewelry');
      return response.jewelry;
    },
  });

export const useAddJewelry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<Jewelry, 'id' | 'created_at' | 'created_by'>) => {
      const response = await apiRequest<{ jewelry: Jewelry }>('/jewelry', {
        method: 'POST',
        body: item,
      });
      return response.jewelry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jewelry }),
  });
};

export const useUpdateJewelry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...item
    }: Partial<Omit<Jewelry, 'id' | 'created_at' | 'created_by'>> & { id: string }) => {
      const response = await apiRequest<{ jewelry: Jewelry }>(`/jewelry/${id}`, {
        method: 'PATCH',
        body: item,
      });
      return response.jewelry;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jewelry }),
  });
};

export const useUpdateJewelryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      quantity,
    }: {
      id: string;
      status: Jewelry['status'];
      quantity?: number;
    }) => {
      await apiRequest(`/jewelry/${id}/status`, {
        method: 'PATCH',
        body: { status, quantity },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jewelry }),
  });
};

export const useDeposits = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.deposits(clientId),
    queryFn: async (): Promise<DepositWithClient[]> => {
      const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
      const response = await apiRequest<{ deposits: DepositWithClient[] }>(`/deposits${suffix}`);
      return response.deposits;
    },
  });

export const useAddDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deposit: { client_id: string; amount: number; note?: string | null }) => {
      const response = await apiRequest<{ deposit: Deposit }>('/deposits', {
        method: 'POST',
        body: deposit,
      });
      return response.deposit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deposits() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });
};

export const useSales = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.sales(clientId),
    queryFn: async (): Promise<SaleWithRelations[]> => {
      const suffix = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
      const response = await apiRequest<{ sales: SaleWithRelations[] }>(`/sales${suffix}`);
      return response.sales;
    },
  });

export const useAddSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: {
      client_id: string;
      jewelry_id: string;
      total_price: number;
      paid_from_balance: number;
      paid_cash: number;
    }) => {
      const response = await apiRequest<{ sale: Sale }>('/sales', {
        method: 'POST',
        body: sale,
      });
      return response.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};

export const useReservations = () =>
  useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const response = await apiRequest<{ reservations: ReservationWithRelations[] }>('/reservations');
      return response.reservations;
    },
  });

export const useAddReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservation: {
      client_id: string;
      jewelry_id: string;
      deposit_amount: number;
      remaining_amount: number;
    }) => {
      const response = await apiRequest<{ reservation: Reservation }>('/reservations', {
        method: 'POST',
        body: reservation,
      });
      return response.reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};
