import type { Client } from '@/hooks/useDatabase';

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function filterClients(clients: Client[], search: string) {
  const normalizedSearch = normalizeSearchValue(search);
  const compactSearch = normalizePhone(search);

  if (!normalizedSearch) {
    return clients;
  }

  return clients.filter((client) =>
    client.name.toLowerCase().includes(normalizedSearch) ||
    client.code.includes(search) ||
    normalizePhone(client.phone).includes(compactSearch)
  );
}
