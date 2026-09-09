import { describe, expect, it } from 'vitest';
import { buildJewelryBatch } from '@/lib/inventory';

describe('buildJewelryBatch', () => {
  it('creates one stock unit per weight and calculates its own prices', () => {
    const batch = buildJewelryBatch({
      baseCode: 'JW-LOT',
      name: 'Alliance',
      materialType: 'gold_18k',
      category: 'rings',
      quantity: 3,
      variableWeights: true,
      unitWeights: '3,42\n3,55\n3,61',
      weight: '',
      purchasePricePerGram: 42_000,
      salePricePerGram: 50_000,
    });

    expect(batch).toHaveLength(3);
    expect(batch.map((item) => item.quantity)).toEqual([1, 1, 1]);
    expect(batch.map((item) => item.weight)).toEqual([3.42, 3.55, 3.61]);
    expect(batch.map((item) => item.purchase_price)).toEqual([143_640, 149_100, 151_620]);
    expect(batch.map((item) => item.sale_price)).toEqual([171_000, 177_500, 180_500]);
    expect(batch.map((item) => item.code)).toEqual(['JW-LOT-01', 'JW-LOT-02', 'JW-LOT-03']);
  });

  it('rejects a quantity that does not match the supplied weights', () => {
    expect(() => buildJewelryBatch({
      baseCode: 'JW-LOT',
      name: 'Alliance',
      materialType: 'gold_18k',
      category: 'rings',
      quantity: 3,
      variableWeights: true,
      unitWeights: '3,42\n3,55',
      weight: '',
      purchasePricePerGram: 42_000,
      salePricePerGram: 50_000,
    })).toThrow('exactement 3 poids');
  });
});

