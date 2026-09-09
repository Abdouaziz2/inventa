import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppDocumentMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppPhone,
} from '@/lib/whatsapp';

describe('WhatsApp document sharing', () => {
  it('adds the Mali country code to an eight-digit local number', () => {
    expect(normalizeWhatsAppPhone('76 12 34 56')).toBe('22376123456');
  });

  it('preserves a number already written in international format', () => {
    expect(normalizeWhatsAppPhone('+34 612 530 234')).toBe('34612530234');
  });

  it('builds a direct WhatsApp URL with an encoded receipt message', () => {
    const message = buildWhatsAppDocumentMessage({
      businessName: 'Bijouterie Test',
      clientName: 'Awa Traoré',
      documentLabel: 'Reçu de dépôt',
      documentNumber: 'DEP-20260620-000001',
      date: '20/06/2026 14:30',
      amountLabel: 'Montant du dépôt',
      amount: '50 000 FCFA',
      paymentMethod: 'Dépôt libre',
      items: [{ description: 'Dépôt sur compte client', quantity: 1, totalPrice: 50_000 }],
    });
    const url = buildWhatsAppUrl('76 12 34 56', message);

    expect(url).toContain('https://wa.me/22376123456?text=');
    expect(decodeURIComponent(url)).toContain('DEP-20260620-000001');
    expect(decodeURIComponent(url)).toContain('50 000 FCFA');
  });
});
