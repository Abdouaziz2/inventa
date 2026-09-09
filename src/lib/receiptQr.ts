import { supabase } from '@/lib/supabase';

export type ReceiptQrPayload = {
  version: 1;
  documentType: string;
  documentNumber: string;
  businessName: string;
  clientName: string;
  amount: number;
  date: string;
  paymentMethod: string;
};

export type VerifiedDocument = {
  documentType: string;
  documentNumber: string;
  businessName: string;
  clientName: string;
  amount: number;
  date: string;
  paymentMethod: string;
  registeredAt: string;
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

const base64UrlToBytes = (value: string) => {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const encodeReceiptQrPayload = (payload: ReceiptQrPayload) =>
  bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));

export const decodeReceiptQrPayload = (value: string): ReceiptQrPayload | null => {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as Partial<ReceiptQrPayload>;
    if (
      parsed.version !== 1 ||
      !parsed.documentType ||
      !parsed.documentNumber ||
      !parsed.businessName ||
      !parsed.clientName ||
      typeof parsed.amount !== 'number' ||
      !parsed.date ||
      !parsed.paymentMethod
    ) {
      return null;
    }
    return parsed as ReceiptQrPayload;
  } catch {
    return null;
  }
};

export const buildReceiptConsultationUrl = (payload: ReceiptQrPayload) => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/+$/u, '');
  const browserUrl =
    typeof window !== 'undefined' && /^https?:$/u.test(window.location.protocol)
      ? window.location.origin
      : '';
  const baseUrl = configuredUrl || browserUrl || 'https://inventa.bayecode.com';
  return `${baseUrl}/verify?document=${encodeURIComponent(encodeReceiptQrPayload(payload))}`;
};

const getPublicBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim().replace(/\/+$/u, '');
  const browserUrl =
    typeof window !== 'undefined' && /^https?:$/u.test(window.location.protocol)
      ? window.location.origin
      : '';
  return configuredUrl || browserUrl || 'https://inventa.bayecode.com';
};

export const buildReceiptVerificationUrl = (token: string) =>
  `${getPublicBaseUrl()}/verify?token=${encodeURIComponent(token)}`;

export async function registerReceiptVerification(
  documentKind: string,
  documentNumber: string,
) {
  const { data, error } = await supabase.rpc('register_document_verification', {
    p_document_kind: documentKind,
    p_document_number: documentNumber,
  });

  if (error) throw error;
  return String(data);
}

export async function verifyReceiptToken(token: string): Promise<VerifiedDocument | null> {
  const { data, error } = await supabase.rpc('verify_document', {
    p_token: token,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  return {
    documentType: String(row.document_type),
    documentNumber: String(row.document_number),
    businessName: String(row.business_name),
    clientName: String(row.client_name),
    amount: Number(row.amount),
    date: String(row.document_date),
    paymentMethod: String(row.payment_method),
    registeredAt: String(row.registered_at),
  };
}
