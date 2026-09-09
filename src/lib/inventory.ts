import type { Jewelry, JewelryCategory, JewelryMaterial } from '@/types/api';

export type JewelryBatchInput = {
  baseCode: string;
  name: string;
  materialType: JewelryMaterial;
  category: JewelryCategory;
  quantity: number;
  variableWeights: boolean;
  unitWeights: string;
  weight: string;
  purchasePricePerGram: number;
  salePricePerGram: number;
  photo?: string | null;
};

export function buildJewelryBatch(
  input: JewelryBatchInput,
): Array<Omit<Jewelry, 'id' | 'created_at' | 'created_by'>> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error('La quantité doit être supérieure à zéro.');
  }

  // Weight and price are now optional at creation time.
  // We default them to 0 if not provided or invalid.
  const weights = input.variableWeights
    ? input.unitWeights
        .split(/[\n;]+/u)
        .map((value) => Number(value.trim().replace(',', '.')) || 0)
        .filter((value) => Number.isFinite(value) && value >= 0) // allow 0 for now
    : [Number(input.weight.replace(',', '.')) || 0];

  if (input.variableWeights && weights.length !== input.quantity) {
    throw new Error(`Saisissez exactement ${input.quantity} poids, un par ligne.`);
  }

  const common = {
    material_type: input.materialType,
    name: input.name.trim(),
    category: input.category,
    photo: input.photo || null,
  };

  if (input.variableWeights) {
    return weights.map((weight, index) => ({
      ...common,
      code: `${input.baseCode}-${String(index + 1).padStart(2, '0')}`,
      quantity: 1,
      weight,
      price_per_gram: input.salePricePerGram || 0,
      purchase_price: Math.round(weight * (input.purchasePricePerGram || 0)),
      sale_price: Math.round(weight * (input.salePricePerGram || 0)),
      status: 'available',
    }));
  }

  return [{
    ...common,
    code: input.baseCode,
    quantity: input.quantity,
    weight: weights[0],
    price_per_gram: input.salePricePerGram || 0,
    purchase_price: Math.round(weights[0] * (input.purchasePricePerGram || 0)),
    sale_price: Math.round(weights[0] * (input.salePricePerGram || 0)),
    status: 'available',
  }];
}

