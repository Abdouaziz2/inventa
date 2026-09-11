export type AppRole = 'super_admin' | 'admin' | 'vendeur';
export type BusinessType = 'jewelry';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'suspended' | 'canceled';
export type JewelryStatus = 'available' | 'reserved' | 'sold' | 'out_of_stock';
export type ReservationStatus = 'active' | 'cancelled' | 'completed' | 'expired';
export type CustomerOrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
export type JewelryCategory = 'rings' | 'necklaces' | 'bracelets' | 'earrings' | 'watches' | 'other';
export type JewelryMaterial = 'gold_14k' | 'gold_18k' | 'gold_21k' | 'gold_22k' | 'gold_24k' | 'silver' | 'diamond';
export type WalletTransactionType =
  | 'deposit_credit'
  | 'deposit_cancellation'
  | 'sale_balance_debit'
  | 'balance_adjustment_credit'
  | 'balance_adjustment_debit';
export type PaymentMethod =
  | 'Espèces'
  | 'Mobile Money'
  | 'Carte'
  | 'Virement bancaire'
  | 'Chèque'
  | 'Mixte'
  | 'Crédit client'
  | 'Autre';

export type AppUser = {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: AppRole;
  companyId: string | null;
  businessType: BusinessType;
  businessName?: string | null;
subscription: {
    planCode: string;
    status: SubscriptionStatus;
    startsAt: string;
    expiresAt: string | null;
    frequency?: string | null;
    amount?: number | null;
  } | null;
  hasActiveSubscription: boolean;
  isDemo?: boolean;
};

export type Client = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string | null;
  balance: number;
  created_at: string;
  created_by?: string | null;
};

export type Jewelry = {
  id: string;
  code: string;
  material_type: JewelryMaterial;
  name: string;
  category: JewelryCategory;
  weight: number;
  price_per_gram: number;
  purchase_price: number;
  sale_price: number;
  quantity: number;
  status: JewelryStatus;
  photo?: string | null;
  created_at: string;
  created_by?: string | null;
};

export type ClientSummary = Pick<Client, 'name' | 'code'>;
export type JewelrySummary = Pick<Jewelry, 'name'>;

export type Deposit = {
  id: string;
  client_id: string;
  amount: number;
  document_number: string;
  status: 'active' | 'cancelled';
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  note?: string | null;
  created_at: string;
  created_by?: string | null;
};

export type Sale = {
  id: string;
  client_id: string | null;
  jewelry_id?: string | null;
  document_number: string;
  total_price: number;
  paid_from_balance: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  paid_cash: number;
  paid_mobile_money: number;
  paid_card: number;
  paid_other: number;
  remaining_amount: number;
  change_amount: number;
  change_to_balance: number;
  created_at: string;
  created_by?: string | null;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  jewelry_id: string;
  jewelry_code: string;
  jewelry_name: string;
  material_type: JewelryMaterial;
  weight: number;
  price_per_gram: number;
  quantity: number;
  line_total: number;
};

export type Reservation = {
  id: string;
  client_id: string;
  jewelry_id: string;
  document_number: string;
  deposit_amount: number;
  remaining_amount: number;
  status: ReservationStatus;
  expires_at?: string | null;
  created_at: string;
  created_by?: string | null;
};

export type CustomerOrder = {
  id: string;
  client_id: string;
  document_number: string;
  description: string;
  quantity: number;
  estimated_weight?: number | null;
  estimated_total: number;
  deposit_amount: number;
  remaining_amount: number;
  expected_date?: string | null;
  status: CustomerOrderStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
};

export type WalletTransaction = {
  id: string;
  client_id: string;
  operation_type: WalletTransactionType;
  operation_id?: string | null;
  document_number: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  created_by?: string | null;
};

export type DepositWithClient = Deposit & { clients: ClientSummary | null };
export type SaleWithRelations = Sale & {
  clients: ClientSummary | null;
  jewelry: JewelrySummary | null;
  items: SaleItem[];
};
export type ReservationWithRelations = Reservation & { clients: ClientSummary | null; jewelry: JewelrySummary | null };
export type CustomerOrderWithClient = CustomerOrder & { clients: ClientSummary | null };
export type Buyback = {
  id: string;
  client_id: string;
  jewelry_id: string | null;
  document_number: string;
  description: string;
  material_type: JewelryMaterial;
  category: JewelryCategory;
  weight: number;
  purchase_amount: number;
  payment_method: string;
  proof_type: string;
  proof_reference: string;
  proof_owner_name: string;
  ownership_verified: boolean;
  notes?: string | null;
  created_at: string;
};
export type BuybackWithClient = Buyback & { clients: ClientSummary | null };
export type SaleReturn = {
  id: string;
  client_id?: string | null;
  sale_id: string;
  document_number: string;
  refund_amount: number;
  payment_method: string;
  reason: string;
  created_at: string;
};
export type SaleReturnWithClient = SaleReturn & { clients: ClientSummary | null };
export type WalletTransactionWithClient = WalletTransaction & { clients: ClientSummary | null };

export type ProfileSettings = {
  id: string;
  company_id: string | null;
  full_name: string;
  phone: string;
  status: UserStatus;
  business_name: string;
  address: string;
  logo: string;
  logo_path: string;
  secondary_phone: string;
  business_type: BusinessType;
  created_at: string;
};
