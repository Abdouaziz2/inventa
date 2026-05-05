import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { getJewelryImageUrl } from '@/services/storage';
import { getCurrentProfile } from '@/services/auth';
import type {
  Client,
  Deposit,
  DepositWithClient,
  Jewelry,
  Reservation,
  ReservationWithRelations,
  Sale,
  SaleItem,
  SaleWithRelations,
  WalletTransaction,
  WalletTransactionWithClient,
} from '@/types/api';

export type {
  Client,
  Jewelry,
  Deposit,
  Sale,
  SaleItem,
  Reservation,
  DepositWithClient,
  SaleWithRelations,
  ReservationWithRelations,
  WalletTransaction,
  WalletTransactionWithClient,
};

type JoinedClient = { name: string; code: string } | null;
type JoinedJewelry = { name: string } | null;

type DepositRow = {
  id: string;
  client_id: string;
  amount: number | string;
  deposit_number: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
};

type SaleItemRow = {
  id: string;
  jewelry_id: string;
  jewelry_code: string;
  jewelry_name: string;
  quantity: number | string;
  unit_price: number | string;
  weight: number | string;
  line_total: number | string;
};

type SaleRow = {
  id: string;
  client_id: string | null;
  sale_number: string;
  total_amount: number | string;
  balance_used: number | string;
  paid_amount: number | string;
  remaining_amount: number | string;
  status: string;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
  sale_items: SaleItemRow[];
};

type ReservationRow = {
  id: string;
  client_id: string;
  jewelry_id: string;
  reservation_number: string;
  deposit_amount: number | string;
  remaining_amount: number | string;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
  jewelry: JoinedJewelry;
};

type WalletTransactionRow = {
  id: string;
  client_id: string;
  operation_type: WalletTransaction['operation_type'];
  operation_id: string | null;
  document_number: string;
  amount: number | string;
  balance_before: number | string;
  balance_after: number | string;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
};

async function signMediaPath(path?: string | null) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return getJewelryImageUrl(path);
}

async function mapJewelryRow(row: Record<string, unknown>): Promise<Jewelry> {
  return {
    id: String(row.id),
    code: String(row.code),
    material_type: String(row.material_type) as Jewelry['material_type'],
    name: String(row.name),
    category: String(row.category) as Jewelry['category'],
    weight: Number(row.weight ?? 0),
    price_per_gram: Number(row.price_per_gram ?? 0),
    purchase_price: Number(row.purchase_price ?? 0),
    sale_price: Number(row.sale_price ?? 0),
    quantity: Number(row.quantity ?? 0),
    status: String(row.status) as Jewelry['status'],
    photo: await signMediaPath((row.photo as string | null | undefined) ?? null),
    created_at: String(row.created_at),
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

function mapClientRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    phone: String(row.phone ?? ''),
    email: (row.email as string | null | undefined) ?? null,
    balance: Number(row.balance ?? 0),
    created_at: String(row.created_at),
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

function frenchMethodToEnum(method: string) {
  switch (method) {
    case 'Mobile Money':
      return 'mobile_money';
    case 'Carte':
      return 'card';
    case 'Virement bancaire':
      return 'bank_transfer';
    case 'Autre':
      return 'other';
    default:
      return 'cash';
  }
}

function createClientCode() {
  return `CL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const useClients = () =>
  useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, code, name, phone, email, balance, created_at, created_by')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapClientRow(row as Record<string, unknown>));
    },
  });

export const useClient = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.client(id),
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, code, name, phone, email, balance, created_at, created_by')
        .eq('id', id)
        .single();

      if (error) throw error;
      return mapClientRow(data as Record<string, unknown>);
    },
  });

export const useAddClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: { name: string; phone: string; email?: string }) => {
      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");

      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: profile.companyId,
          code: createClientCode(),
          name: client.name,
          phone: client.phone,
          email: client.email ?? null,
          created_by: profile.id,
        })
        .select('id, code, name, phone, email, balance, created_at, created_by')
        .single();

      if (error) throw error;
      return mapClientRow(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.clients }),
  });
};

export const useUpdateClientBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const { data: current, error: currentError } = await supabase
        .from('clients')
        .select('balance')
        .eq('id', id)
        .single();

      if (currentError) throw currentError;

      const delta = balance - Number(current.balance ?? 0);
      const { error } = await supabase.rpc('adjust_client_balance', {
        p_client_id: id,
        p_amount: delta,
        p_reason: 'balance_adjustment',
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions(variables.id) });
    },
  });
};

export const useJewelry = () =>
  useQuery({
    queryKey: queryKeys.jewelry,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jewelry')
        .select('id, code, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_at, created_by')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return Promise.all((data ?? []).map((row) => mapJewelryRow(row as Record<string, unknown>)));
    },
  });

export const useAddJewelry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<Jewelry, 'id' | 'created_at' | 'created_by'>) => {
      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");

      const { data, error } = await supabase
        .from('jewelry')
        .insert({
          ...item,
          company_id: profile.companyId,
          created_by: profile.id,
        })
        .select('id, code, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_at, created_by')
        .single();

      if (error) throw error;
      return mapJewelryRow(data as Record<string, unknown>);
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
      const { data, error } = await supabase
        .from('jewelry')
        .update(item)
        .eq('id', id)
        .select('id, code, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_at, created_by')
        .single();

      if (error) throw error;
      return mapJewelryRow(data as Record<string, unknown>);
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
      const updates: Record<string, unknown> = { status };
      if (typeof quantity === 'number') updates.quantity = quantity;
      const { error } = await supabase.from('jewelry').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jewelry }),
  });
};

export const useDeposits = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.deposits(clientId),
    queryFn: async (): Promise<DepositWithClient[]> => {
      let query = supabase
        .from('deposits')
        .select('id, client_id, amount, deposit_number, note, created_at, created_by, clients(name, code)')
        .order('created_at', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const deposit = row as unknown as DepositRow;
        return {
        id: String(row.id),
        client_id: String(deposit.client_id),
        amount: Number(deposit.amount ?? 0),
        document_number: String(deposit.deposit_number),
        note: deposit.note ?? null,
        created_at: String(deposit.created_at),
        created_by: deposit.created_by ? String(deposit.created_by) : null,
        clients: deposit.clients ? { name: deposit.clients.name, code: deposit.clients.code } : null,
      };
      });
    },
  });

export const useAddDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deposit: { client_id: string; amount: number; note?: string | null }) => {
      const { data: depositId, error: createError } = await supabase.rpc('create_deposit', {
        p_client_id: deposit.client_id,
        p_amount: deposit.amount,
        p_method: 'cash',
        p_reference: null,
        p_note: deposit.note ?? null,
      });

      if (createError) throw createError;

      const { data, error } = await supabase
        .from('deposits')
        .select('id, client_id, amount, deposit_number, note, created_at, created_by')
        .eq('id', depositId)
        .single();

      if (error) throw error;

      return {
        id: String(data.id),
        client_id: String(data.client_id),
        amount: Number(data.amount ?? 0),
        document_number: String(data.deposit_number),
        note: data.note ?? null,
        created_at: String(data.created_at),
        created_by: data.created_by ? String(data.created_by) : null,
      } as Deposit;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.deposits() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.client_id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions(variables.client_id) });
    },
  });
};

export const useSales = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.sales(clientId),
    queryFn: async (): Promise<SaleWithRelations[]> => {
      let query = supabase
        .from('sales')
        .select('id, client_id, sale_number, total_amount, balance_used, paid_amount, remaining_amount, status, created_at, created_by, clients(name, code), sale_items(id, jewelry_id, jewelry_code, jewelry_name, quantity, unit_price, weight, line_total)')
        .order('created_at', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const saleRow = row as unknown as SaleRow;
        const items: SaleItem[] = (saleRow.sale_items ?? []).map((item) => ({
          id: String(item.id),
          sale_id: String(saleRow.id),
          jewelry_id: String(item.jewelry_id),
          jewelry_code: String(item.jewelry_code),
          jewelry_name: String(item.jewelry_name),
          material_type: 'gold',
          weight: Number(item.weight ?? 0),
          price_per_gram: Number(item.unit_price ?? 0),
          quantity: Number(item.quantity ?? 0),
          line_total: Number(item.line_total ?? 0),
        }));

        const externalPaid = Math.max(0, Number(saleRow.paid_amount ?? 0) - Number(saleRow.balance_used ?? 0));
        return {
          id: String(saleRow.id),
          client_id: saleRow.client_id ? String(saleRow.client_id) : '',
          jewelry_id: items[0]?.jewelry_id ?? null,
          document_number: String(saleRow.sale_number),
          total_price: Number(saleRow.total_amount ?? 0),
          paid_from_balance: Number(saleRow.balance_used ?? 0),
          paid_amount: externalPaid,
          payment_method: 'Espèces',
          paid_cash: externalPaid,
          paid_mobile_money: 0,
          paid_card: 0,
          paid_other: 0,
          remaining_amount: Number(saleRow.remaining_amount ?? 0),
          change_amount: 0,
          change_to_balance: 0,
          created_at: String(saleRow.created_at),
          created_by: saleRow.created_by ? String(saleRow.created_by) : null,
          clients: saleRow.clients ? { name: saleRow.clients.name, code: saleRow.clients.code } : null,
          jewelry: items[0] ? { name: items[0].jewelry_name } : null,
          items,
        };
      });
    },
  });

export const useAddSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sale: {
      client_id: string;
      items: { jewelry_id: string; quantity: number }[];
      use_balance: boolean;
      paid_amount: number;
      payment_method: string;
    }) => {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('balance')
        .eq('id', sale.client_id)
        .single();

      if (clientError) throw clientError;

      const { data: stockRows, error: stockError } = await supabase
        .from('jewelry')
        .select('id, sale_price, quantity')
        .in('id', sale.items.map((item) => item.jewelry_id));
      if (stockError) throw stockError;

      const total = sale.items.reduce((sum, item) => {
        const row = stockRows?.find((candidate) => candidate.id === item.jewelry_id);
        return sum + Number(row?.sale_price ?? 0) * item.quantity;
      }, 0);

      const balanceUsed = sale.use_balance ? Math.min(Number(client.balance ?? 0), total) : 0;
      const payments =
        sale.paid_amount > 0
          ? [{ method: frenchMethodToEnum(sale.payment_method), amount: sale.paid_amount, reference: null }]
          : [];

      const { data: saleId, error: createError } = await supabase.rpc('create_sale', {
        p_client_id: sale.client_id,
        p_items: sale.items,
        p_payments: payments,
        p_balance_used: balanceUsed,
        p_discount: 0,
        p_note: null,
      });
      if (createError) throw createError;

      const { data, error } = await supabase
        .from('sales')
        .select('id, client_id, sale_number, total_amount, balance_used, paid_amount, remaining_amount, created_at, created_by, sale_items(id, jewelry_id, jewelry_code, jewelry_name, quantity, unit_price, weight, line_total)')
        .eq('id', saleId)
        .single();
      if (error) throw error;

      const saleData = data as unknown as Omit<SaleRow, 'clients' | 'status'>;
      const items: SaleItem[] = (saleData.sale_items ?? []).map((item) => ({
        id: String(item.id),
        sale_id: String(saleData.id),
        jewelry_id: String(item.jewelry_id),
        jewelry_code: String(item.jewelry_code),
        jewelry_name: String(item.jewelry_name),
        material_type: 'gold',
        weight: Number(item.weight ?? 0),
        price_per_gram: Number(item.unit_price ?? 0),
        quantity: Number(item.quantity ?? 0),
        line_total: Number(item.line_total ?? 0),
      }));

      return {
        id: String(saleData.id),
        client_id: String(saleData.client_id),
        jewelry_id: items[0]?.jewelry_id ?? null,
        document_number: String(saleData.sale_number),
        total_price: Number(saleData.total_amount ?? 0),
        paid_from_balance: Number(saleData.balance_used ?? 0),
        paid_amount: Math.max(0, Number(saleData.paid_amount ?? 0) - Number(saleData.balance_used ?? 0)),
        payment_method: sale.payment_method,
        paid_cash: sale.payment_method === 'Espèces' ? sale.paid_amount : 0,
        paid_mobile_money: sale.payment_method === 'Mobile Money' ? sale.paid_amount : 0,
        paid_card: sale.payment_method === 'Carte' ? sale.paid_amount : 0,
        paid_other: !['Espèces', 'Mobile Money', 'Carte'].includes(sale.payment_method) ? sale.paid_amount : 0,
        remaining_amount: Number(saleData.remaining_amount ?? 0),
        change_amount: 0,
        change_to_balance: 0,
        created_at: String(saleData.created_at),
        created_by: saleData.created_by ? String(saleData.created_by) : null,
        clients: null,
        jewelry: items[0] ? { name: items[0].jewelry_name } : null,
        items,
      } as SaleWithRelations;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sales() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.client_id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions(variables.client_id) });
    },
  });
};

export const useReservations = () =>
  useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, client_id, jewelry_id, reservation_number, deposit_amount, remaining_amount, created_at, created_by, clients(name, code), jewelry(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const reservation = row as unknown as ReservationRow;
        return {
          id: String(reservation.id),
          client_id: String(reservation.client_id),
          jewelry_id: String(reservation.jewelry_id),
          document_number: String(reservation.reservation_number),
          deposit_amount: Number(reservation.deposit_amount ?? 0),
          remaining_amount: Number(reservation.remaining_amount ?? 0),
          created_at: String(reservation.created_at),
          created_by: reservation.created_by ? String(reservation.created_by) : null,
          clients: reservation.clients ? { name: reservation.clients.name, code: reservation.clients.code } : null,
          jewelry: reservation.jewelry ? { name: reservation.jewelry.name } : null,
        };
      });
    },
  });

export const useAddReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservation: {
      client_id: string;
      jewelry_id: string;
      deposit_amount: number;
    }) => {
      const { data: reservationId, error: createError } = await supabase.rpc('create_reservation', {
        p_client_id: reservation.client_id,
        p_jewelry_id: reservation.jewelry_id,
        p_deposit_amount: reservation.deposit_amount,
        p_expires_at: null,
      });
      if (createError) throw createError;

      const { data, error } = await supabase
        .from('reservations')
        .select('id, client_id, jewelry_id, reservation_number, deposit_amount, remaining_amount, created_at, created_by')
        .eq('id', reservationId)
        .single();
      if (error) throw error;

      return {
        id: String(data.id),
        client_id: String(data.client_id),
        jewelry_id: String(data.jewelry_id),
        document_number: String(data.reservation_number),
        deposit_amount: Number(data.deposit_amount ?? 0),
        remaining_amount: Number(data.remaining_amount ?? 0),
        created_at: String(data.created_at),
        created_by: data.created_by ? String(data.created_by) : null,
      } as Reservation;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.client_id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};

export const useWalletTransactions = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.walletTransactions(clientId),
    queryFn: async (): Promise<WalletTransactionWithClient[]> => {
      let query = supabase
        .from('wallet_transactions')
        .select('id, client_id, operation_type, operation_id, document_number, amount, balance_before, balance_after, created_at, created_by, clients(name, code)')
        .order('created_at', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const transaction = row as unknown as WalletTransactionRow;
        return {
          id: String(transaction.id),
          client_id: String(transaction.client_id),
          operation_type: transaction.operation_type,
          operation_id: transaction.operation_id ? String(transaction.operation_id) : null,
          document_number: String(transaction.document_number),
          amount: Number(transaction.amount ?? 0),
          balance_before: Number(transaction.balance_before ?? 0),
          balance_after: Number(transaction.balance_after ?? 0),
          created_at: String(transaction.created_at),
          created_by: transaction.created_by ? String(transaction.created_by) : null,
          clients: transaction.clients ? { name: transaction.clients.name, code: transaction.clients.code } : null,
        };
      });
    },
  });
