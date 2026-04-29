import { ConflictError, ValidationError } from './errors.js';

export function buildDocumentNumber(prefix, sequence, dateValue = new Date()) {
  const date = new Date(dateValue);
  const normalizedDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const compactDate = `${normalizedDate.getFullYear()}${String(normalizedDate.getMonth() + 1).padStart(2, '0')}${String(
    normalizedDate.getDate(),
  ).padStart(2, '0')}`;
  const normalizedSequence = String(sequence).replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  const paddedSequence =
    normalizedSequence.length >= 6 ? normalizedSequence : normalizedSequence.padStart(6, '0');

  return `${prefix}-${compactDate}-${paddedSequence}`;
}

export function parseId(value, message = 'Identifiant invalide.') {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(message);
  }
  return parsed;
}

export function parseAmount(
  value,
  message,
  { min = 0, allowZero = true } = {},
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(message);
  }

  if (allowZero ? parsed < min : parsed <= min) {
    throw new ValidationError(message);
  }

  return Number(parsed.toFixed(2));
}

export function parseNonNegativeInteger(value, message) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(message);
  }

  return parsed;
}

export function computeJewelryTotalPrice(weight, pricePerGram) {
  const normalizedWeight = parseAmount(weight ?? 0, 'Poids invalide.', {
    min: 0,
    allowZero: true,
  });
  const normalizedPricePerGram = parseAmount(pricePerGram ?? 0, 'Prix au gramme invalide.', {
    min: 0,
    allowZero: true,
  });

  return Number((normalizedWeight * normalizedPricePerGram).toFixed(2));
}

export function requireText(value, message) {
  const parsed = String(value ?? '').trim();

  if (!parsed) {
    throw new ValidationError(message);
  }

  return parsed;
}

export function computeSaleAmounts(clientBalance, salePrice) {
  const totalPrice = parseAmount(salePrice, 'Prix de vente invalide.', {
    min: 0,
    allowZero: false,
  });
  const normalizedBalance = parseAmount(clientBalance ?? 0, 'Solde client invalide.', {
    min: 0,
    allowZero: true,
  });
  const paidFromBalance = Math.min(normalizedBalance, totalPrice);
  const paidCash = Number((totalPrice - paidFromBalance).toFixed(2));

  return {
    totalPrice,
    paidFromBalance,
    paidCash,
  };
}

export function computeReservationAmounts(salePrice, depositAmount) {
  const totalPrice = parseAmount(salePrice, 'Prix de vente invalide.', {
    min: 0,
    allowZero: false,
  });
  const normalizedDeposit = parseAmount(
    depositAmount,
    "Le montant de l'acompte doit être supérieur à 0.",
    { min: 0, allowZero: false },
  );

  if (normalizedDeposit > totalPrice) {
    throw new ValidationError("L'acompte ne peut pas dépasser le prix du bijou.");
  }

  return {
    depositAmount: normalizedDeposit,
    remainingAmount: Number((totalPrice - normalizedDeposit).toFixed(2)),
  };
}

export function ensureAvailableJewelryForSale(jewelry) {
  const quantity = Number(jewelry?.quantity ?? 0);

  if (quantity <= 0 || jewelry?.status === 'out_of_stock') {
    throw new ConflictError('Ce bijou est en rupture de stock.');
  }

  if (jewelry?.status !== 'available') {
    throw new ConflictError('Ce bijou ne peut pas être vendu dans son statut actuel.');
  }
}

export function ensureAvailableJewelryForReservation(jewelry) {
  const quantity = Number(jewelry?.quantity ?? 0);

  if (quantity <= 0 || jewelry?.status === 'out_of_stock') {
    throw new ConflictError('Ce bijou est indisponible pour une réservation.');
  }

  if (jewelry?.status !== 'available') {
    throw new ConflictError("Ce bijou n'est pas disponible pour une réservation.");
  }
}
