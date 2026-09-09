type WhatsAppDocumentItem = {
  description: string;
  quantity?: number;
  totalPrice: number;
};

type WhatsAppDocumentMessage = {
  businessName: string;
  clientName: string;
  documentLabel: string;
  documentNumber: string;
  date: string;
  amountLabel: string;
  amount: string;
  paymentMethod: string;
  items: WhatsAppDocumentItem[];
};

export const normalizeWhatsAppPhone = (value: string, defaultCountryCode = '223') => {
  let digits = value.replace(/\D/g, '');

  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 8) digits = `${defaultCountryCode}${digits}`;
  if (digits.startsWith('0') && digits.length === 9) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : '';
};

export const buildWhatsAppDocumentMessage = ({
  businessName,
  clientName,
  documentLabel,
  documentNumber,
  date,
  amountLabel,
  amount,
  paymentMethod,
  items,
}: WhatsAppDocumentMessage) => {
  const itemLines = items
    .map((item) => `- ${item.description} x${item.quantity ?? 1} : ${item.totalPrice.toLocaleString('fr-FR')} FCFA`)
    .join('\n');

  return [
    `*${businessName}*`,
    `Bonjour ${clientName},`,
    '',
    `Voici votre *${documentLabel.toLowerCase()}*.`,
    `N° : ${documentNumber}`,
    `Date : ${date}`,
    `${amountLabel} : ${amount}`,
    `Règlement : ${paymentMethod}`,
    ...(itemLines ? ['', 'Articles :', itemLines] : []),
    '',
    'Merci pour votre confiance.',
  ].join('\n');
};

export const buildWhatsAppUrl = (phone: string, message: string) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return '';
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};
