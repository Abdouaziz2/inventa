import { describe, expect, it } from 'vitest';
import { validatePositiveAmount } from '@/lib/validation';

describe('financial input validation', () => {
  it('rejects zero and negative amounts', () => {
    expect(validatePositiveAmount('0', 'Le montant')).toContain('supérieur à 0');
    expect(validatePositiveAmount('-10', 'Le montant')).toContain('supérieur à 0');
  });

  it('rejects an amount above the allowed maximum', () => {
    expect(validatePositiveAmount('120000', "Le montant de l'acompte", 100000)).toContain(
      'ne peut pas dépasser',
    );
  });

  it('accepts a positive amount within the maximum', () => {
    expect(validatePositiveAmount('75000', 'Le montant', 100000)).toBe('');
  });
});
