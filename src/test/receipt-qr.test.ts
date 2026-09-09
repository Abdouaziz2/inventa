import { describe, expect, it } from 'vitest';
import { decodeReceiptQrPayload, encodeReceiptQrPayload, type ReceiptQrPayload } from '@/lib/receiptQr';

describe('receipt QR payload', () => {
  const payload: ReceiptQrPayload = {
    version: 1,
    documentType: 'Reçu de dépôt',
    documentNumber: 'DEP-20260621-000001',
    businessName: 'Bijouterie Ndaanaane',
    clientName: 'Awa Traoré',
    amount: 50_000,
    date: '2026-06-21T10:00:00.000Z',
    paymentMethod: 'Dépôt libre',
  };

  it('round-trips accented receipt information', () => {
    expect(decodeReceiptQrPayload(encodeReceiptQrPayload(payload))).toEqual(payload);
  });

  it('rejects malformed QR content', () => {
    expect(decodeReceiptQrPayload('contenu-invalide')).toBeNull();
  });
});
