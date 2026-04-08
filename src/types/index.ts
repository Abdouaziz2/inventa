export type UserRole = 'super_admin' | 'admin';

export interface User {
  id: string;
  code: string;
  name: string;
  role: UserRole;
}

export interface Client {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
  createdAt: string;
}

export type JewelryStatus = 'available' | 'reserved' | 'sold' | 'out_of_stock';
export type JewelryCategory = 'rings' | 'necklaces' | 'bracelets' | 'earrings' | 'watches' | 'other';
export type JewelryMaterial = 'gold' | 'silver' | 'diamond';

export interface Jewelry {
  id: string;
  code: string;
  materialType: JewelryMaterial;
  name: string;
  category: JewelryCategory;
  weight: number;
  quantity: number;
  pricePerGram: number;
  purchasePrice: number;
  salePrice: number;
  status: JewelryStatus;
  photo?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  note?: string;
  date: string;
}

export interface Reservation {
  id: string;
  clientId: string;
  clientName: string;
  jewelryId: string;
  jewelryName: string;
  depositAmount: number;
  remainingAmount: number;
  date: string;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  jewelryId: string;
  jewelryName: string;
  totalPrice: number;
  paidFromBalance: number;
  paidCash: number;
  date: string;
}
