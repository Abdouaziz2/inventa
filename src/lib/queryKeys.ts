export const queryKeys = {
  clients: ["clients"] as const,
  client: (id?: string) => ["clients", id] as const,
  jewelry: ["jewelry"] as const,
  deposits: (clientId?: string) => (clientId ? ["deposits", clientId] as const : ["deposits"] as const),
  sales: (clientId?: string) => (clientId ? ["sales", clientId] as const : ["sales"] as const),
  reservations: ["reservations"] as const,
  customerOrders: ["customer-orders"] as const,
  buybacks: (clientId?: string) => (clientId ? ["buybacks", clientId] as const : ["buybacks"] as const),
  saleReturns: (clientId?: string) => (clientId ? ["sale-returns", clientId] as const : ["sale-returns"] as const),
  walletTransactions: (clientId?: string) =>
    (clientId ? ["wallet-transactions", clientId] as const : ["wallet-transactions"] as const),
  profileSettings: ["profile-settings"] as const,
} as const;
