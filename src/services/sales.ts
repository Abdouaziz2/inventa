import { supabase } from '@/lib/supabase';

export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer' | 'other';

export type SaleItemInput = {
  jewelry_id: string;
  quantity: number;
};

export type PaymentInput = {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
};

export type CreateSaleInput = {
  client_id?: string | null;
  items: SaleItemInput[];
  payments: PaymentInput[];
  balance_used?: number;
  discount?: number;
  note?: string | null;
};

export async function createSale(input: CreateSaleInput) {
  const { data, error } = await supabase.rpc('create_sale', {
    p_client_id: input.client_id ?? null,
    p_items: input.items,
    p_payments: input.payments,
    p_balance_used: input.balance_used ?? 0,
    p_discount: input.discount ?? 0,
    p_note: input.note ?? null,
  });

  if (error) throw error;
  return data;
}
