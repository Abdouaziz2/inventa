import { Client, Jewelry, Deposit, Sale, Reservation, User } from '@/types';

export const mockUsers: User[] = [
  { id: '1', code: 'ADM001', name: 'Admin Principal', role: 'admin' },
  { id: '2', code: 'VND001', name: 'Fatima Diallo', role: 'seller' },
  { id: '3', code: 'MGR001', name: 'Moussa Ndiaye', role: 'manager' },
];

export const mockClients: Client[] = [
  { id: '1', code: '100001', name: 'Aminata Diop', phone: '+221 77 123 45 67', balance: 750000, createdAt: '2024-01-15' },
  { id: '2', code: '100002', name: 'Ousmane Sow', phone: '+221 76 987 65 43', balance: 425000, createdAt: '2024-02-20' },
  { id: '3', code: '100003', name: 'Fatou Ndiaye', phone: '+221 78 555 44 33', balance: 1250000, createdAt: '2024-03-10' },
  { id: '4', code: '100004', name: 'Ibrahima Fall', phone: '+221 77 111 22 33', balance: 160000, createdAt: '2024-04-05' },
  { id: '5', code: '100005', name: 'Aïssatou Ba', phone: '+221 76 777 88 99', balance: 2100000, createdAt: '2024-05-12' },
  { id: '6', code: '100006', name: 'Cheikh Diallo', phone: '+221 78 666 55 44', balance: 0, createdAt: '2024-06-01' },
];

export const mockJewelry: Jewelry[] = [
  { id: '1', name: 'Bague Solitaire Diamant', category: 'rings', weight: 3.5, purchasePrice: 600000, salePrice: 925000, status: 'available', createdAt: '2024-01-10' },
  { id: '2', name: 'Collier Perles Akoya', category: 'necklaces', weight: 28, purchasePrice: 400000, salePrice: 700000, status: 'available', createdAt: '2024-01-15' },
  { id: '3', name: 'Bracelet Or 18K', category: 'bracelets', weight: 15, purchasePrice: 1100000, salePrice: 1600000, status: 'reserved', createdAt: '2024-02-01' },
  { id: '4', name: 'Boucles Émeraude', category: 'earrings', weight: 4.2, purchasePrice: 750000, salePrice: 1200000, status: 'available', createdAt: '2024-02-10' },
  { id: '5', name: 'Montre Cartier Tank', category: 'watches', weight: 45, purchasePrice: 2750000, salePrice: 3900000, status: 'sold', createdAt: '2024-03-01' },
  { id: '6', name: 'Alliance Or Rose', category: 'rings', weight: 5, purchasePrice: 300000, salePrice: 475000, status: 'available', createdAt: '2024-03-15' },
  { id: '7', name: 'Pendentif Saphir', category: 'necklaces', weight: 8, purchasePrice: 900000, salePrice: 1400000, status: 'available', createdAt: '2024-04-01' },
  { id: '8', name: 'Bracelet Tennis Diamants', category: 'bracelets', weight: 12, purchasePrice: 1750000, salePrice: 2600000, status: 'reserved', createdAt: '2024-04-15' },
];

export const mockDeposits: Deposit[] = [
  { id: '1', clientId: '1', clientName: 'Aminata Diop', amount: 250000, note: 'Acompte bague', date: '2024-06-01' },
  { id: '2', clientId: '3', clientName: 'Fatou Ndiaye', amount: 500000, note: 'Versement régulier', date: '2024-06-02' },
  { id: '3', clientId: '5', clientName: 'Aïssatou Ba', amount: 750000, date: '2024-06-03' },
  { id: '4', clientId: '2', clientName: 'Ousmane Sow', amount: 150000, note: 'Premier versement', date: '2024-06-04' },
  { id: '5', clientId: '1', clientName: 'Aminata Diop', amount: 500000, note: 'Deuxième versement', date: '2024-06-05' },
];

export const mockSales: Sale[] = [
  { id: '1', clientId: '5', clientName: 'Aïssatou Ba', jewelryId: '5', jewelryName: 'Montre Cartier Tank', totalPrice: 3900000, paidFromBalance: 2100000, paidCash: 1800000, date: '2024-06-01' },
];

export const mockReservations: Reservation[] = [
  { id: '1', clientId: '3', clientName: 'Fatou Ndiaye', jewelryId: '3', jewelryName: 'Bracelet Or 18K', depositAmount: 500000, remainingAmount: 1100000, date: '2024-06-02' },
  { id: '2', clientId: '1', clientName: 'Aminata Diop', jewelryId: '8', jewelryName: 'Bracelet Tennis Diamants', depositAmount: 750000, remainingAmount: 1850000, date: '2024-06-04' },
];

export const dailySalesData = [
  { day: 'Lun', amount: 1250000 },
  { day: 'Mar', amount: 900000 },
  { day: 'Mer', amount: 1600000 },
  { day: 'Jeu', amount: 2250000 },
  { day: 'Ven', amount: 1400000 },
  { day: 'Sam', amount: 3250000 },
  { day: 'Dim', amount: 600000 },
];
