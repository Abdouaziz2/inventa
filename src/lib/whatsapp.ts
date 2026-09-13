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

export type SubscriptionReminderParams = {
  clientName: string;
  companyName?: string;
  planName: string;
  amount?: number;
  expiresAt: string | null;
  daysRemaining: number;
  paymentUrl: string;
};

export const buildSubscriptionReminderWhatsAppMessage = ({
  clientName,
  companyName,
  planName,
  amount,
  expiresAt,
  daysRemaining,
  paymentUrl,
}: SubscriptionReminderParams) => {
  const expiryText =
    daysRemaining <= 0
      ? 'votre abonnement Inventa est arrivé à expiration'
      : `votre abonnement Inventa arrive à échéance dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}`;

  const formattedDate = expiresAt
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(expiresAt))
    : null;

  return [
    `*Inventa · Rappel de renouvellement*`,
    `Bonjour ${clientName || 'Cher client'}${companyName ? ` (${companyName})` : ''},`,
    '',
    `Nous vous informons que ${expiryText}.`,
    `📦 *Offre :* ${planName}`,
    ...(amount && amount > 0 ? [`💰 *Montant :* ${amount.toLocaleString('fr-FR')} FCFA`] : []),
    ...(formattedDate ? [`📅 *Date d'échéance :* ${formattedDate}`] : []),
    '',
    `Pour renouveler immédiatement et continuer à piloter vos stocks et ventes sans interruption :`,
    paymentUrl,
    '',
    `Paiement rapide et sécurisé via Wave Business.`,
    `L'équipe Inventa vous remercie !`,
  ].join('\n');
};

export const buildSubscriptionReminderWhatsAppUrl = (
  phone: string,
  params: SubscriptionReminderParams,
) => {
  const message = buildSubscriptionReminderWhatsAppMessage(params);
  return buildWhatsAppUrl(phone, message);
};
