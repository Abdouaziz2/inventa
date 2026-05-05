import { supabase } from '@/lib/supabase';
import type { Jewelry } from '@/types/api';

export async function getAvailableStock() {
  const { data, error } = await supabase
    .from('jewelry')
    .select('id, code, material_type, name, category, weight, price_per_gram, purchase_price, sale_price, quantity, status, photo, created_at, created_by')
    .in('status', ['available', 'reserved', 'out_of_stock'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Jewelry[];
}

export async function decrementJewelryStock(jewelryId: string, quantity: number) {
  const { data: row, error: readError } = await supabase
    .from('jewelry')
    .select('id, quantity')
    .eq('id', jewelryId)
    .single();

  if (readError) throw readError;

  const nextQuantity = Math.max(0, Number(row.quantity) - quantity);
  const nextStatus = nextQuantity === 0 ? 'out_of_stock' : 'available';

  const { error } = await supabase
    .from('jewelry')
    .update({
      quantity: nextQuantity,
      status: nextStatus,
    })
    .eq('id', jewelryId);

  if (error) throw error;
}
