export const queryKeys = {
  clients: ["clients"] as const,
  client: (id?: string) => ["clients", id] as const,
  jewelry: ["jewelry"] as const,
  deposits: (clientId?: string) => ["deposits", clientId] as const,
  sales: (clientId?: string) => ["sales", clientId] as const,
  reservations: ["reservations"] as const,
  profileSettings: ["profile-settings"] as const,
} as const;
