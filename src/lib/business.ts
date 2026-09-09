export type BusinessType = 'jewelry';

export const businessTypeOptions: Array<{
  value: BusinessType;
  label: string;
  description: string;
}> = [
  {
    value: 'jewelry',
    label: 'Bijouterie',
    description: 'Bijoux, matières, réservations et commandes sur mesure.',
  },
];

const configs = {
  jewelry: {
    typeLabel: 'Bijouterie',
    shopFallback: 'Ma bijouterie',
    inventoryLabel: 'Produits',
    inventoryTitle: 'Catalogue produits',
    itemSingular: 'produit',
    itemPlural: 'produits',
    itemIcon: '💎',
    attributeLabel: 'Matière',
    categoryLabel: 'Catégorie',
    addTitle: 'Ajouter un produit',
    addSuccess: 'Produit ajouté avec succès',
    codePrefix: 'JW',
    attributes: [
      { key: 'gold_18k', label: 'Or 18K' },
      { key: 'gold_21k', label: 'Or 21K' },
      { key: 'silver', label: 'Argent' },
      { key: 'diamond', label: 'Diamant' },
    ],
    categories: [
      { key: 'rings', label: 'Bagues' },
      { key: 'necklaces', label: 'Colliers' },
      { key: 'bracelets', label: 'Bracelets' },
      { key: 'earrings', label: "Boucles d'oreilles" },
      { key: 'watches', label: 'Montres' },
      { key: 'other', label: 'Autre' },
    ],
    dashboardDescription: 'Ventes, encaissements, stock et commandes de la bijouterie.',
  },
} as const;

export function normalizeBusinessType(value: unknown): BusinessType {
  return 'jewelry';
}

export function getBusinessConfig(type: BusinessType | null | undefined) {
  return configs[normalizeBusinessType(type)];
}

export function formatBusinessAttribute(type: BusinessType | null | undefined, value: string) {
  return getBusinessConfig(type).attributes.find((item) => item.key === value)?.label ?? value;
}
