export function validatePositiveAmount(value: string, label: string, maximum?: number) {
  const amount = Number(value);

  if (!value.trim() || !Number.isFinite(amount) || amount <= 0) {
    return `${label} doit être supérieur à 0.`;
  }

  if (maximum !== undefined && amount > maximum) {
    return `${label} ne peut pas dépasser ${maximum.toLocaleString('fr-FR')} FCFA.`;
  }

  return '';
}
