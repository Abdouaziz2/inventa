import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Client = Tables<'clients'>;
export type Jewelry = Tables<'jewelry'>;
export type Deposit = Tables<'deposits'>;
export type Sale = Tables<'sales'>;
export type Reservation = Tables<'reservations'>;

// ─── Clients ─────────────────────────────────────────
export const useClients = () =>
  useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

export const useClient = (id: string | undefined) =>
  useQuery({
    queryKey: ['clients', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Client;
    },
  });

export const useAddClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { name: string; phone: string; email?: string }) => {
      const { data, error } = await supabase.from('clients').insert({ ...client, code: '' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClientBalance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { error } = await supabase.from('clients').update({ balance }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

// ─── Jewelry ─────────────────────────────────────────
export const useJewelry = () =>
  useQuery({
    queryKey: ['jewelry'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jewelry').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Jewelry[];
    },
  });

export const useAddJewelry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: TablesInsert<'jewelry'>) => {
      const { data, error } = await supabase.from('jewelry').insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jewelry'] }),
  });
};

export const useUpdateJewelryStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'available' | 'reserved' | 'sold' }) => {
      const { error } = await supabase.from('jewelry').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jewelry'] }),
  });
};

// ─── Deposits ────────────────────────────────────────
export const useDeposits = (clientId?: string) =>
  useQuery({
    queryKey: ['deposits', clientId],
    queryFn: async () => {
      let q = supabase.from('deposits').select('*, clients(name, code)').order('created_at', { ascending: false });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useAddDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deposit: TablesInsert<'deposits'>) => {
      const { data, error } = await supabase.from('deposits').insert(deposit).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deposits'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

// ─── Sales ───────────────────────────────────────────
export const useSales = (clientId?: string) =>
  useQuery({
    queryKey: ['sales', clientId],
    queryFn: async () => {
      let q = supabase.from('sales').select('*, clients(name, code), jewelry(name)').order('created_at', { ascending: false });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const useAddSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sale: TablesInsert<'sales'>) => {
      const { data, error } = await supabase.from('sales').insert(sale).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['jewelry'] });
    },
  });
};

// ─── Reservations ────────────────────────────────────
export const useReservations = () =>
  useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('reservations').select('*, clients(name, code), jewelry(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const useAddReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: TablesInsert<'reservations'>) => {
      const { data, error } = await supabase.from('reservations').insert(reservation).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['jewelry'] });
    },
  });
};
