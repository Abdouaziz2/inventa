import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { normalizePhone } from '@/lib/clients';
import { getJewelryImageUrl } from '@/services/storage';
import { getCurrentProfile } from '@/services/auth';
import { getDemoInventory, getDemoSession, saveDemoInventory } from '@/lib/demo';
import type {
  Client,
  Buyback,
  BuybackWithClient,
  CustomerOrder,
  CustomerOrderWithClient,
  Deposit,
  DepositWithClient,
  Jewelry,
  Reservation,
  ReservationWithRelations,
  Sale,
  SaleReturn,
  SaleReturnWithClient,
  SaleItem,
  SaleWithRelations,
  WalletTransaction,
  WalletTransactionWithClient,
} from '@/types/api';

export type {
  Client,
  Buyback,
  BuybackWithClient,
  CustomerOrder,
  CustomerOrderWithClient,
  Jewelry,
  Deposit,
  Sale,
  SaleReturn,
  SaleReturnWithClient,
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
  status: Deposit['status'];
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
};

type SaleItemRow = {
  id: string;
  jewelry_id: string | null;
  jewelry_code: string;
  jewelry_name: string;
  material_type: string;
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
  status: Reservation['status'];
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  clients: JoinedClient;
  jewelry: JoinedJewelry;
};

type CustomerOrderRow = {
  id: string;
  client_id: string;
  order_number: string;
  description: string;
  quantity: number | string;
  estimated_weight: number | string | null;
  estimated_total: number | string;
  deposit_amount: number | string;
  remaining_amount: number | string;
  expected_date: string | null;
  status: CustomerOrder['status'];
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  clients: JoinedClient;
};

type BuybackRow = {
  id: string;
  client_id: string;
  jewelry_id: string | null;
  buyback_number: string;
  description: string;
  material_type: Buyback['material_type'];
  category: Buyback['category'];
  weight: number | string;
  purchase_amount: number | string;
  payment_method: string;
  proof_type: string;
  proof_reference: string;
  proof_owner_name: string;
  ownership_verified: boolean;
  notes: string | null;
  created_at: string;
  clients: JoinedClient;
};

type SaleReturnRow = {
  id: string;
  client_id: string | null;
  sale_id: string;
  return_number: string;
  refund_amount: number | string;
  payment_method: string;
  reason: string;
  created_at: string;
  clients: JoinedClient;
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
  const quantity = Math.max(0, Number(row.quantity ?? 0));
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
    quantity,
    status: quantity > 0 ? 'available' : 'out_of_stock',
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

function createOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `CMD-${date}-${Math.floor(1000 + Math.random() * 9000)}`;
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
      const trimmedPhone = client.phone.trim();
      const normalizedPhone = normalizePhone(trimmedPhone);

      if (normalizedPhone) {
        const { data: existingClients, error: existingClientsError } = await supabase
          .from('clients')
          .select('id, phone')
          .eq('company_id', profile.companyId);

        if (existingClientsError) throw existingClientsError;

        const duplicateClient = (existingClients ?? []).find((existing) =>
          normalizePhone(String(existing.phone ?? '')) === normalizedPhone,
        );

        if (duplicateClient) {
          throw new Error('Un client avec ce numero de telephone existe deja dans cette boutique.');
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          company_id: profile.companyId,
          code: createClientCode(),
          name: client.name,
          phone: trimmedPhone,
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

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, phone }: { id: string; name: string; phone: string }) => {
      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");
      const trimmedPhone = phone.trim();
      const normalizedPhone = normalizePhone(trimmedPhone);

      if (normalizedPhone) {
        const { data: existingClients, error: existingClientsError } = await supabase
          .from('clients')
          .select('id, phone')
          .eq('company_id', profile.companyId)
          .neq('id', id);

        if (existingClientsError) throw existingClientsError;

        const duplicateClient = (existingClients ?? []).find((existing) =>
          normalizePhone(String(existing.phone ?? '')) === normalizedPhone,
        );

        if (duplicateClient) {
          throw new Error('Un client avec ce numero de telephone existe deja dans cette boutique.');
        }
      }

      const { data, error } = await supabase
        .from('clients')
        .update({ name: name.trim(), phone: trimmedPhone })
        .eq('id', id)
        .eq('company_id', profile.companyId)
        .select('id, code, name, phone, email, balance, created_at, created_by')
        .single();

      if (error) throw error;
      return mapClientRow(data as Record<string, unknown>);
    },
    onSuccess: (client) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(client.id) });
    },
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
    queryKey: [...queryKeys.jewelry, getDemoSession()?.businessType ?? 'live'],
    queryFn: async () => {
      const demo = getDemoSession();
      if (demo) return getDemoInventory(demo.businessType);
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
      const demo = getDemoSession();
      if (demo) {
        const created: Jewelry = {
          ...item,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          created_by: demo.id,
        };
        saveDemoInventory(demo.businessType, [created, ...getDemoInventory(demo.businessType)]);
        return created;
      }
      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");

      const { data, error } = await supabase
        .from('jewelry')
        .insert({
          ...item,
          status: item.quantity > 0 ? 'available' : 'out_of_stock',
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

export const useAddJewelryBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: Array<Omit<Jewelry, 'id' | 'created_at' | 'created_by'>>) => {
      if (items.length === 0) throw new Error('Le lot est vide');

      const demo = getDemoSession();
      if (demo) {
        const created = items.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          created_by: demo.id,
        } satisfies Jewelry));
        saveDemoInventory(demo.businessType, [...created, ...getDemoInventory(demo.businessType)]);
        return created;
      }

      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");
      const rows = items.map((item) => ({
        ...item,
        status: item.quantity > 0 ? 'available' : 'out_of_stock',
        company_id: profile.companyId,
        created_by: profile.id,
      }));

      const { data, error } = await supabase
        .from('jewelry')
        .insert(rows)
        .select('id, code, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_at, created_by');

      if (error) throw error;
      return Promise.all((data ?? []).map((row) => mapJewelryRow(row as Record<string, unknown>)));
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
      const demo = getDemoSession();
      if (demo) {
        const inventory = getDemoInventory(demo.businessType);
        const current = inventory.find((entry) => entry.id === id);
        if (!current) throw new Error('Référence introuvable');
        const updated = { ...current, ...item };
        saveDemoInventory(
          demo.businessType,
          inventory.map((entry) => (entry.id === id ? updated : entry)),
        );
        return updated;
      }
      const normalizedItem = typeof item.quantity === 'number'
        ? { ...item, status: item.quantity > 0 ? 'available' : 'out_of_stock' }
        : item;
      const { data, error } = await supabase
        .from('jewelry')
        .update(normalizedItem)
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
      const demo = getDemoSession();
      if (demo) {
        const inventory = getDemoInventory(demo.businessType);
        saveDemoInventory(
          demo.businessType,
          inventory.map((entry) =>
            entry.id === id
              ? { ...entry, status, quantity: typeof quantity === 'number' ? quantity : entry.quantity }
              : entry,
          ),
        );
        return;
      }
      const updates: Record<string, unknown> = { status };
      if (typeof quantity === 'number') updates.quantity = quantity;
      const { error } = await supabase.from('jewelry').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.jewelry }),
  });
};

export const useAdjustJewelryStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      delta,
      reason,
    }: {
      id: string;
      delta: number;
      reason: string;
    }) => {
      const demo = getDemoSession();
      if (demo) {
        const inventory = getDemoInventory(demo.businessType);
        const current = inventory.find((entry) => entry.id === id);
        if (!current) throw new Error('Référence introuvable');
        const nextQuantity = Math.max(0, current.quantity + delta);
        saveDemoInventory(
          demo.businessType,
          inventory.map((entry) =>
            entry.id === id
              ? { ...entry, quantity: nextQuantity, status: nextQuantity > 0 ? 'available' : 'out_of_stock' }
              : entry,
          ),
        );
        return nextQuantity;
      }
      const { data, error } = await supabase.rpc('adjust_jewelry_stock', {
        p_jewelry_id: id,
        p_delta: delta,
        p_reason: reason,
      });

      if (error) throw error;
      return Number(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};

export const useDeposits = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.deposits(clientId),
    queryFn: async (): Promise<DepositWithClient[]> => {
      let query = supabase
        .from('deposits')
        .select('id, client_id, amount, deposit_number, status, cancelled_at, cancelled_by, cancellation_reason, note, created_at, created_by, clients(name, code)')
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
          status: deposit.status ?? 'active',
          cancelled_at: deposit.cancelled_at,
          cancelled_by: deposit.cancelled_by,
          cancellation_reason: deposit.cancellation_reason,
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
        .select('id, client_id, amount, deposit_number, status, cancelled_at, cancelled_by, cancellation_reason, note, created_at, created_by')
        .eq('id', depositId)
        .single();

      if (error) throw error;

      return {
        id: String(data.id),
        client_id: String(data.client_id),
        amount: Number(data.amount ?? 0),
        document_number: String(data.deposit_number),
        status: (data.status as Deposit['status']) ?? 'active',
        cancelled_at: data.cancelled_at ?? null,
        cancelled_by: data.cancelled_by ?? null,
        cancellation_reason: data.cancellation_reason ?? null,
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

export const useCancelDeposit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; client_id: string; reason?: string | null }) => {
      const { error } = await supabase.rpc('cancel_deposit', {
        p_deposit_id: id,
        p_reason: reason ?? null,
      });

      if (error) throw error;
      return id;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.deposits() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deposits(variables.client_id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.client_id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions(variables.client_id) });
    },
  });
};

export const usePurgeTestData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (confirmation: string) => {
      const { data, error } = await supabase.rpc('purge_test_data', {
        p_confirmation: confirmation,
      });

      if (error) throw error;
      return data as Record<string, number>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deposits() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sales() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders });
      void queryClient.invalidateQueries({ queryKey: queryKeys.buybacks() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.saleReturns() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
    },
  });
};

export const useSales = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.sales(clientId),
    queryFn: async (): Promise<SaleWithRelations[]> => {
      let query = supabase
        .from('sales')
        .select('id, client_id, sale_number, total_amount, balance_used, paid_amount, remaining_amount, status, created_at, created_by, clients(name, code), sale_items(id, jewelry_id, jewelry_code, jewelry_name, material_type, quantity, unit_price, weight, line_total)')
        .order('created_at', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const saleRow = row as unknown as SaleRow;
        const items: SaleItem[] = (saleRow.sale_items ?? []).map((item) => ({
          id: String(item.id),
          sale_id: String(saleRow.id),
          jewelry_id: item.jewelry_id ? String(item.jewelry_id) : null,
          jewelry_code: String(item.jewelry_code),
          jewelry_name: String(item.jewelry_name),
          material_type: String(item.material_type) as Jewelry['material_type'],
          weight: Number(item.weight ?? 0),
          price_per_gram: Number(item.unit_price ?? 0),
          quantity: Number(item.quantity ?? 0),
          line_total: Number(item.line_total ?? 0),
        }));

        const externalPaid = Math.max(0, Number(saleRow.paid_amount ?? 0) - Number(saleRow.balance_used ?? 0));
        return {
          id: String(saleRow.id),
          client_id: saleRow.client_id ? String(saleRow.client_id) : null,
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
      client_id: string | null;
      items: { jewelry_id: string; quantity: number; weight: number; unit_price: number }[];
      use_balance: boolean;
      paid_amount: number;
      payment_method: string;
    }) => {
      let clientBalance = 0;
      if (sale.client_id) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('balance')
          .eq('id', sale.client_id)
          .single();
        if (clientError) throw clientError;
        clientBalance = Number(client.balance ?? 0);
      }

      const { data: stockRows, error: stockError } = await supabase
        .from('jewelry')
        .select('id, quantity')
        .in('id', sale.items.map((item) => item.jewelry_id));
      if (stockError) throw stockError;

      const total = sale.items.reduce((sum, item) => {
        return sum + item.weight * item.unit_price * item.quantity;
      }, 0);

      const balanceUsed = sale.client_id && sale.use_balance ? Math.min(clientBalance, total) : 0;
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
        .select('id, client_id, sale_number, total_amount, balance_used, paid_amount, remaining_amount, created_at, created_by, sale_items(id, jewelry_id, jewelry_code, jewelry_name, material_type, quantity, unit_price, weight, line_total)')
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
        material_type: String(item.material_type) as Jewelry['material_type'],
        weight: Number(item.weight ?? 0),
        price_per_gram: Number(item.unit_price ?? 0),
        quantity: Number(item.quantity ?? 0),
        line_total: Number(item.line_total ?? 0),
      }));

      return {
        id: String(saleData.id),
        client_id: saleData.client_id ? String(saleData.client_id) : null,
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
      if (variables.client_id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.client(variables.client_id) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
      void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      if (variables.client_id) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions(variables.client_id) });
      }
    },
  });
};

export const useReservations = () =>
  useQuery({
    queryKey: queryKeys.reservations,
    queryFn: async (): Promise<ReservationWithRelations[]> => {
      const { error: expirationError } = await supabase.rpc('expire_due_reservations');
      if (expirationError) throw expirationError;

      const { data, error } = await supabase
        .from('reservations')
        .select('id, client_id, jewelry_id, reservation_number, deposit_amount, remaining_amount, status, expires_at, created_at, created_by, clients(name, code), jewelry(name)')
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
          status: reservation.status,
          expires_at: reservation.expires_at,
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
      expires_at?: string | null;
    }) => {
      const { data: reservationId, error: createError } = await supabase.rpc('create_reservation', {
        p_client_id: reservation.client_id,
        p_jewelry_id: reservation.jewelry_id,
        p_deposit_amount: reservation.deposit_amount,
        p_expires_at: reservation.expires_at ?? null,
      });
      if (createError) throw createError;

      const { data, error } = await supabase
        .from('reservations')
        .select('id, client_id, jewelry_id, reservation_number, deposit_amount, remaining_amount, status, expires_at, created_at, created_by')
        .eq('id', reservationId)
        .single();
      if (error) throw error;

      return {
        id: String(data.id),
        client_id: String(data.client_id),
        jewelry_id: data.jewelry_id ? String(data.jewelry_id) : null,
        document_number: String(data.reservation_number),
        deposit_amount: Number(data.deposit_amount ?? 0),
        remaining_amount: Number(data.remaining_amount ?? 0),
        status: data.status as Reservation['status'],
        expires_at: data.expires_at,
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

export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const { error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservationId,
      });

      if (error) throw error;
      return reservationId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};

export const useCustomerOrders = () =>
  useQuery({
    queryKey: queryKeys.customerOrders,
    queryFn: async (): Promise<CustomerOrderWithClient[]> => {
      const { data, error } = await supabase
        .from('customer_orders')
        .select('id, client_id, order_number, description, quantity, estimated_weight, estimated_total, deposit_amount, remaining_amount, expected_date, status, notes, created_at, updated_at, created_by, clients(name, code)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => {
        const order = row as unknown as CustomerOrderRow;
        return {
          id: String(order.id),
          client_id: String(order.client_id),
          document_number: String(order.order_number),
          description: String(order.description),
          quantity: Number(order.quantity ?? 1),
          estimated_weight: order.estimated_weight === null ? null : Number(order.estimated_weight),
          estimated_total: Number(order.estimated_total ?? 0),
          deposit_amount: Number(order.deposit_amount ?? 0),
          remaining_amount: Number(order.remaining_amount ?? 0),
          expected_date: order.expected_date,
          status: order.status,
          notes: order.notes,
          created_at: String(order.created_at),
          updated_at: String(order.updated_at),
          created_by: order.created_by ? String(order.created_by) : null,
          clients: order.clients ? { name: order.clients.name, code: order.clients.code } : null,
        };
      });
    },
  });

export const useAddCustomerOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      client_id: string;
      description: string;
      quantity: number;
      estimated_weight?: number | null;
      estimated_total: number;
      deposit_amount: number;
      expected_date?: string | null;
      notes?: string | null;
    }) => {
      const profile = await getCurrentProfile();
      if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");

      const { data, error } = await supabase
        .from('customer_orders')
        .insert({
          company_id: profile.companyId,
          client_id: order.client_id,
          order_number: createOrderNumber(),
          description: order.description.trim(),
          quantity: order.quantity,
          estimated_weight: order.estimated_weight ?? null,
          estimated_total: order.estimated_total,
          deposit_amount: order.deposit_amount,
          expected_date: order.expected_date ?? null,
          notes: order.notes?.trim() || null,
          created_by: profile.id,
        })
        .select('id, client_id, order_number, description, quantity, estimated_weight, estimated_total, deposit_amount, remaining_amount, expected_date, status, notes, created_at, updated_at, created_by')
        .single();

      if (error) throw error;

      return {
        id: String(data.id),
        client_id: String(data.client_id),
        document_number: String(data.order_number),
        description: String(data.description),
        quantity: Number(data.quantity ?? 1),
        estimated_weight: data.estimated_weight === null ? null : Number(data.estimated_weight),
        estimated_total: Number(data.estimated_total ?? 0),
        deposit_amount: Number(data.deposit_amount ?? 0),
        remaining_amount: Number(data.remaining_amount ?? 0),
        expected_date: data.expected_date,
        status: data.status as CustomerOrder['status'],
        notes: data.notes,
        created_at: String(data.created_at),
        updated_at: String(data.updated_at),
        created_by: data.created_by ? String(data.created_by) : null,
      } as CustomerOrder;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders });
    },
  });
};

export const useUpdateCustomerOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CustomerOrder['status'] }) => {
      const { error } = await supabase.from('customer_orders').update({ status }).eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders });
    },
  });
};

export const useBuybacks = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.buybacks(clientId),
    queryFn: async (): Promise<BuybackWithClient[]> => {
      let query = supabase
        .from('buybacks')
        .select('id, client_id, jewelry_id, buyback_number, description, material_type, category, weight, purchase_amount, payment_method, proof_type, proof_reference, proof_owner_name, ownership_verified, notes, created_at, clients(name, code)')
        .order('created_at', { ascending: false });
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => {
        const item = row as unknown as BuybackRow;
        return {
          id: String(item.id),
          client_id: String(item.client_id),
          jewelry_id: String(item.jewelry_id),
          document_number: String(item.buyback_number),
          description: String(item.description),
          material_type: item.material_type,
          category: item.category,
          weight: Number(item.weight),
          purchase_amount: Number(item.purchase_amount),
          payment_method: String(item.payment_method),
          proof_type: String(item.proof_type),
          proof_reference: String(item.proof_reference),
          proof_owner_name: String(item.proof_owner_name),
          ownership_verified: Boolean(item.ownership_verified),
          notes: item.notes,
          created_at: String(item.created_at),
          clients: item.clients ? { name: item.clients.name, code: item.clients.code } : null,
        };
      });
    },
  });

export const useAddBuyback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      description: string;
      material_type: Buyback['material_type'];
      category: Buyback['category'];
      weight: number;
      purchase_amount: number;
      payment_method: string;
      proof_type: string;
      proof_reference: string;
      proof_owner_name: string;
      ownership_verified: boolean;
      notes?: string;
    }) => {
      const { data: id, error } = await supabase.rpc('create_buyback', {
        p_client_id: input.client_id,
        p_description: input.description,
        p_material_type: input.material_type,
        p_category: input.category,
        p_weight: input.weight,
        p_purchase_amount: input.purchase_amount,
        p_payment_method: input.payment_method,
        p_proof_type: input.proof_type,
        p_proof_reference: input.proof_reference,
        p_proof_owner_name: input.proof_owner_name,
        p_ownership_verified: input.ownership_verified,
        p_notes: input.notes || null,
      });
      if (error) throw error;
      const { data, error: readError } = await supabase
        .from('buybacks')
        .select('id, client_id, jewelry_id, buyback_number, description, material_type, category, weight, purchase_amount, payment_method, proof_type, proof_reference, proof_owner_name, ownership_verified, notes, created_at')
        .eq('id', id)
        .single();
      if (readError) throw readError;
      return {
        id: String(data.id),
        client_id: String(data.client_id),
        jewelry_id: String(data.jewelry_id),
        document_number: String(data.buyback_number),
        description: String(data.description),
        material_type: data.material_type as Buyback['material_type'],
        category: data.category as Buyback['category'],
        weight: Number(data.weight),
        purchase_amount: Number(data.purchase_amount),
        payment_method: String(data.payment_method),
        proof_type: String(data.proof_type),
        proof_reference: String(data.proof_reference),
        proof_owner_name: String(data.proof_owner_name),
        ownership_verified: Boolean(data.ownership_verified),
        notes: data.notes,
        created_at: String(data.created_at),
      } as Buyback;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.buybacks() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jewelry });
    },
  });
};

export const useSaleReturns = (clientId?: string) =>
  useQuery({
    queryKey: queryKeys.saleReturns(clientId),
    queryFn: async (): Promise<SaleReturnWithClient[]> => {
      let query = supabase
        .from('sale_returns')
        .select('id, client_id, sale_id, return_number, refund_amount, payment_method, reason, created_at, clients(name, code)')
        .order('created_at', { ascending: false });
      if (clientId) query = query.eq('client_id', clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => {
        const item = row as unknown as SaleReturnRow;
        return {
          id: String(item.id),
          client_id: item.client_id ? String(item.client_id) : null,
          sale_id: String(item.sale_id),
          document_number: String(item.return_number),
          refund_amount: Number(item.refund_amount),
          payment_method: String(item.payment_method),
          reason: String(item.reason),
          created_at: String(item.created_at),
          clients: item.clients ? { name: item.clients.name, code: item.clients.code } : null,
        };
      });
    },
  });

export const useAddSaleReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sale_id: string;
      refund_amount: number;
      payment_method: string;
      reason: string;
    }) => {
      const { data: id, error } = await supabase.rpc('create_sale_return', {
        p_sale_id: input.sale_id,
        p_refund_amount: input.refund_amount,
        p_payment_method: input.payment_method,
        p_reason: input.reason,
      });
      if (error) throw error;
      const { data, error: readError } = await supabase
        .from('sale_returns')
        .select('id, client_id, sale_id, return_number, refund_amount, payment_method, reason, created_at')
        .eq('id', id)
        .single();
      if (readError) throw readError;
      return {
        id: String(data.id),
        client_id: data.client_id ? String(data.client_id) : null,
        sale_id: String(data.sale_id),
        document_number: String(data.return_number),
        refund_amount: Number(data.refund_amount),
        payment_method: String(data.payment_method),
        reason: String(data.reason),
        created_at: String(data.created_at),
      } as SaleReturn;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.saleReturns() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sales() });
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
