import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Client = Tables<'clients'>;
export type Jewelry = Tables<'jewelry'>;
export type Deposit = Tables<'deposits'>;
export type Sale = Tables<'sales'>;
export type Reservation = Tables<'reservations'>;
export type ClientSummary = Pick<Client, 'name' | 'code'>;
export type JewelrySummary = Pick<Jewelry, 'name'>;
export type DepositWithClient = Deposit & { clients: ClientSummary | null };
export type SaleWithRelations = Sale & {
  clients: ClientSummary | null;
  jewelry: JewelrySummary | null;
};
export type ReservationWithRelations = Reservation & {
  clients: ClientSummary | null;
  jewelry: JewelrySummary | null;
};

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
      const payload: TablesInsert<'clients'> = { ...client, code: '' };
      const { data, error } = await supabase.from('clients').insert(payload).select().single();
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
      const payload: TablesInsert<'jewelry'> = item;
      const { data, error } = await supabase.from('jewelry').insert(payload).select().single();
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
    queryFn: async (): Promise<DepositWithClient[]> => {
      let q = supabase.from('deposits').select('*, clients(name, code)').order('created_at', { ascending: false });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DepositWithClient[];
    },
  });

export const useAddDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deposit: TablesInsert<'deposits'>) => {
      const payload: TablesInsert<'deposits'> = deposit;
      const { data, error } = await supabase.from('deposits').insert(payload).select().single();
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
    queryFn: async (): Promise<SaleWithRelations[]> => {
      let q = supabase.from('sales').select('*, clients(name, code), jewelry(name)').order('created_at', { ascending: false });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SaleWithRelations[];
    },
  });

export const useAddSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sale: TablesInsert<'sales'>) => {
      const payload: TablesInsert<'sales'> = sale;
      const { data, error } = await supabase.from('sales').insert(payload).select().single();
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
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const { data, error } = await supabase.from('reservations').select('*, clients(name, code), jewelry(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReservationWithRelations[];
    },
  });

export const useAddReservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reservation: TablesInsert<'reservations'>) => {
      const payload: TablesInsert<'reservations'> = reservation;
      const { data, error } = await supabase.from('reservations').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['jewelry'] });
    },
  });
};
