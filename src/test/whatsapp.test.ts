import { describe, expect, it } from 'vitest';
import {
  buildSubscriptionReminderWhatsAppMessage,
  buildSubscriptionReminderWhatsAppUrl,
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

  it('adds the Senegal country code (221) to a nine-digit number', () => {
    expect(normalizeWhatsAppPhone('77 240 68 74')).toBe('221772406874');
    expect(normalizeWhatsAppPhone('772406874')).toBe('221772406874');
    expect(normalizeWhatsAppPhone('+221 77 240 68 74')).toBe('221772406874');
  });

  it('builds a subscription reminder message and WhatsApp URL with payment link and object signature', () => {
    const params = {
      phone: '77 240 68 74',
      clientName: 'Moussa Diop',
      companyName: 'Bijouterie Keur Gui',
      planName: 'Business',
      amount: 11500,
      expiresAt: '2026-09-20T12:00:00.000Z',
      daysRemaining: 3,
      paymentUrl: 'https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=11500',
    };

    const message = buildSubscriptionReminderWhatsAppMessage(params);
    expect(message).toContain('Inventa · Rappel de renouvellement');
    expect(message).toContain('Moussa Diop (Bijouterie Keur Gui)');
    expect(message).toContain('échéance dans 3 jours');
    expect(message).toContain('11\u202F500 FCFA');
    expect(message).toContain('77 240 68 74');
    expect(message).toContain('https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=11500');

    const url = buildSubscriptionReminderWhatsAppUrl('76 12 34 56', params);
    expect(url).toContain('https://wa.me/22376123456?text=');
    expect(decodeURIComponent(url)).toContain('11\u202F500 FCFA');
    // Test calling with object
    const urlFromObject = buildSubscriptionReminderWhatsAppUrl(params);
    expect(urlFromObject).toContain('https://wa.me/221772406874?text=');

    // Test calling with separate phone argument
    const urlFromArgs = buildSubscriptionReminderWhatsAppUrl('772406874', params);
    expect(urlFromArgs).toContain('https://wa.me/221772406874?text=');
  });
});
