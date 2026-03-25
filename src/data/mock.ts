import { Client, Jewelry, Deposit, Sale, Reservation, User } from '@/types';

export const mockUsers: User[] = [
  { id: '1', code: 'ADM001', name: 'Admin Principal', role: 'admin' },
  { id: '2', code: 'VND001', name: 'Fatima Zahra', role: 'seller' },
  { id: '3', code: 'MGR001', name: 'Karim Benali', role: 'manager' },
];

export const mockClients: Client[] = [
  { id: '1', code: '100001', name: 'Amina El Fassi', phone: '+212 6 12 34 56 78', balance: 15000, createdAt: '2024-01-15' },
  { id: '2', code: '100002', name: 'Youssef Tazi', phone: '+212 6 98 76 54 32', balance: 8500, createdAt: '2024-02-20' },
  { id: '3', code: '100003', name: 'Nadia Chraibi', phone: '+212 6 55 44 33 22', balance: 25000, createdAt: '2024-03-10' },
  { id: '4', code: '100004', name: 'Omar Benjelloun', phone: '+212 6 11 22 33 44', balance: 3200, createdAt: '2024-04-05' },
  { id: '5', code: '100005', name: 'Khadija Alaoui', phone: '+212 6 77 88 99 00', balance: 42000, createdAt: '2024-05-12' },
  { id: '6', code: '100006', name: 'Hassan Idrissi', phone: '+212 6 66 55 44 33', balance: 0, createdAt: '2024-06-01' },
];

export const mockJewelry: Jewelry[] = [
  { id: '1', name: 'Bague Solitaire Diamant', category: 'rings', weight: 3.5, purchasePrice: 12000, salePrice: 18500, status: 'available', createdAt: '2024-01-10' },
  { id: '2', name: 'Collier Perles Akoya', category: 'necklaces', weight: 28, purchasePrice: 8000, salePrice: 14000, status: 'available', createdAt: '2024-01-15' },
  { id: '3', name: 'Bracelet Or 18K', category: 'bracelets', weight: 15, purchasePrice: 22000, salePrice: 32000, status: 'reserved', createdAt: '2024-02-01' },
  { id: '4', name: 'Boucles Émeraude', category: 'earrings', weight: 4.2, purchasePrice: 15000, salePrice: 24000, status: 'available', createdAt: '2024-02-10' },
  { id: '5', name: 'Montre Cartier Tank', category: 'watches', weight: 45, purchasePrice: 55000, salePrice: 78000, status: 'sold', createdAt: '2024-03-01' },
  { id: '6', name: 'Alliance Or Rose', category: 'rings', weight: 5, purchasePrice: 6000, salePrice: 9500, status: 'available', createdAt: '2024-03-15' },
  { id: '7', name: 'Pendentif Saphir', category: 'necklaces', weight: 8, purchasePrice: 18000, salePrice: 28000, status: 'available', createdAt: '2024-04-01' },
  { id: '8', name: 'Bracelet Tennis Diamants', category: 'bracelets', weight: 12, purchasePrice: 35000, salePrice: 52000, status: 'reserved', createdAt: '2024-04-15' },
];

export const mockDeposits: Deposit[] = [
  { id: '1', clientId: '1', clientName: 'Amina El Fassi', amount: 5000, note: 'Acompte bague', date: '2024-06-01' },
  { id: '2', clientId: '3', clientName: 'Nadia Chraibi', amount: 10000, note: 'Versement régulier', date: '2024-06-02' },
  { id: '3', clientId: '5', clientName: 'Khadija Alaoui', amount: 15000, date: '2024-06-03' },
  { id: '4', clientId: '2', clientName: 'Youssef Tazi', amount: 3000, note: 'Premier versement', date: '2024-06-04' },
  { id: '5', clientId: '1', clientName: 'Amina El Fassi', amount: 10000, note: 'Deuxième versement', date: '2024-06-05' },
];

export const mockSales: Sale[] = [
  { id: '1', clientId: '5', clientName: 'Khadija Alaoui', jewelryId: '5', jewelryName: 'Montre Cartier Tank', totalPrice: 78000, paidFromBalance: 42000, paidCash: 36000, date: '2024-06-01' },
];

export const mockReservations: Reservation[] = [
  { id: '1', clientId: '3', clientName: 'Nadia Chraibi', jewelryId: '3', jewelryName: 'Bracelet Or 18K', depositAmount: 10000, remainingAmount: 22000, date: '2024-06-02' },
  { id: '2', clientId: '1', clientName: 'Amina El Fassi', jewelryId: '8', jewelryName: 'Bracelet Tennis Diamants', depositAmount: 15000, remainingAmount: 37000, date: '2024-06-04' },
];

export const dailySalesData = [
  { day: 'Lun', amount: 25000 },
  { day: 'Mar', amount: 18000 },
  { day: 'Mer', amount: 32000 },
  { day: 'Jeu', amount: 45000 },
  { day: 'Ven', amount: 28000 },
  { day: 'Sam', amount: 65000 },
  { day: 'Dim', amount: 12000 },
];
