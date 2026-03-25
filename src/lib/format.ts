/**
 * Format a number as FCFA currency: "150 000 FCFA"
 */
export const formatCFA = (amount: number): string => {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
};
