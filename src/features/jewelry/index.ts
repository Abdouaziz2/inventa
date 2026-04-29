export {
  useJewelry,
  useAddJewelry,
  useUpdateJewelry,
  useUpdateJewelryStatus,
  type Jewelry,
} from '@/hooks/useDatabase';
export type { JewelryCategory, JewelryMaterial, JewelryStatus } from '@/types/api';

export type JewelryStatusFilter = 'all' | 'available' | 'reserved' | 'sold' | 'out_of_stock' | 'low_stock';
export type JewelrySortKey = 'recent' | 'name' | 'code' | 'sale_price_desc' | 'sale_price_asc' | 'quantity_desc' | 'quantity_asc';

export const jewelryStatusOptions: { key: JewelryStatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'available', label: 'Disponible' },
  { key: 'reserved', label: 'Reserve' },
  { key: 'sold', label: 'Vendu' },
  { key: 'out_of_stock', label: 'Rupture' },
  { key: 'low_stock', label: 'Stock faible' },
];

export const jewelrySortOptions: { key: JewelrySortKey; label: string }[] = [
  { key: 'recent', label: 'Plus recents' },
  { key: 'name', label: 'Nom A-Z' },
  { key: 'code', label: 'Code A-Z' },
  { key: 'sale_price_desc', label: 'Prix vente decroissant' },
  { key: 'sale_price_asc', label: 'Prix vente croissant' },
  { key: 'quantity_desc', label: 'Stock decroissant' },
  { key: 'quantity_asc', label: 'Stock croissant' },
];

export const jewelryMaterialOptions = [
  { key: 'gold', label: 'Or' },
  { key: 'silver', label: 'Argent' },
  { key: 'diamond', label: 'Diamant' },
] as const;

export function formatJewelryMaterial(material: string) {
  if (material === 'silver') return 'Argent';
  if (material === 'diamond') return 'Diamant';
  return 'Or';
}

export function calculateSalePrice(weight: string, pricePerGram: string) {
  const parsedWeight = parseFloat(weight) || 0;
  const parsedPricePerGram = parseFloat(pricePerGram) || 0;
  return Math.round(parsedWeight * parsedPricePerGram);
}

export function getJewelryTotalPrice<T extends { weight: number; price_per_gram: number; sale_price: number }>(
  item: T,
) {
  if (item.weight > 0 && item.price_per_gram > 0) {
    return calculateSalePrice(String(item.weight), String(item.price_per_gram));
  }

  return item.sale_price;
}

export function filterJewelry(search: string, statusFilter: JewelryStatusFilter) {
  const normalizedSearch = search.trim().toLowerCase();

  return <
    T extends {
      name: string;
      code: string;
      category: string;
      material_type: string;
      status: string;
      quantity: number;
    },
  >(
    items: T[],
  ) =>
    items.filter((item) => {
      const haystack = `${item.name} ${item.code} ${item.category} ${item.material_type}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'low_stock'
            ? item.quantity > 0 && item.quantity <= 3
            : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
}

export function sortJewelry<
  T extends {
    created_at: string;
    name: string;
    code: string;
    weight: number;
    price_per_gram: number;
    sale_price: number;
    quantity: number;
  },
>(items: T[], sortKey: JewelrySortKey) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    switch (sortKey) {
      case 'name':
        return left.name.localeCompare(right.name, 'fr');
      case 'code':
        return left.code.localeCompare(right.code, 'fr');
      case 'sale_price_desc':
        return getJewelryTotalPrice(right) - getJewelryTotalPrice(left);
      case 'sale_price_asc':
        return getJewelryTotalPrice(left) - getJewelryTotalPrice(right);
      case 'quantity_desc':
        return right.quantity - left.quantity;
      case 'quantity_asc':
        return left.quantity - right.quantity;
      case 'recent':
      default:
        return right.created_at.localeCompare(left.created_at);
    }
  });

  return sorted;
}

export function getReservableJewelry<T extends { status: string; quantity: number }>(items: T[]) {
  return items.filter((item) => item.status === 'available' && item.quantity > 0);
}

export function getSellableJewelry<T extends { status: string; quantity: number }>(items: T[]) {
  return items.filter((item) => item.status === 'available' && item.quantity > 0);
}
