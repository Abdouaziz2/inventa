export type UserRole = 'admin' | 'seller' | 'manager';

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

export type JewelryStatus = 'available' | 'reserved' | 'sold';
export type JewelryCategory = 'rings' | 'necklaces' | 'bracelets' | 'earrings' | 'watches' | 'other';

export interface Jewelry {
  id: string;
  name: string;
  category: JewelryCategory;
  weight: number;
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
