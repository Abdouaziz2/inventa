import { supabase } from '@/lib/supabase';
import { getCurrentProfile } from '@/services/auth';
import type { Client } from '@/types/api';

export type CreateClientInput = {
  code: string;
  name: string;
  phone?: string;
  email?: string | null;
};

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, code, name, phone, email, balance, created_at, created_by')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function createClient(input: CreateClientInput) {
  const profile = await getCurrentProfile();
  if (!profile?.companyId) throw new Error("Configurez d'abord la boutique");

  const { data, error } = await supabase
    .from('clients')
    .insert({
      company_id: profile.companyId,
      code: input.code,
      name: input.name,
      phone: input.phone ?? '',
      email: input.email ?? null,
      created_by: profile.id,
    })
    .select('id, code, name, phone, email, balance, created_at, created_by')
    .single();

  if (error) throw error;
  return data as Client;
}
