import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Banknote, Boxes, CheckCircle2, FileText, PackageCheck, ShoppingBag, Users } from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/contexts/AuthContext';
import { useJewelry } from '@/features/jewelry';
import { formatBusinessAttribute } from '@/lib/business';
import { formatCFA } from '@/lib/format';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import SectionCard from '@/components/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const DemoDashboard = () => {
  const { user } = useAuth();
  const { config } = useBusiness();
  const { data: products = [] } = useJewelry();
  const inventoryValue = products.reduce((sum, product) => sum + product.sale_price * product.quantity, 0);
  const lowStock = products.filter((product) => product.quantity > 0 && product.quantity <= 3);
  const outOfStock = products.filter((product) => product.quantity <= 0);

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title={user?.businessName || config.shopFallback}
        description={config.dashboardDescription}
        actions={
          <Button asChild className="gold-gradient text-accent-foreground">
            <Link to="/products/add">Ajouter un {config.itemSingular}</Link>
          </Button>
        }
      />

      <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Mode démonstration locale.</strong> Les changements restent uniquement dans ce navigateur.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Ventes du jour" value={formatCFA(725000)} subtitle="Exemple de démonstration" icon={Banknote} variant="gold" />
        <StatCard title={`Références ${config.inventoryLabel.toLowerCase()}`} value={String(products.length)} subtitle={`${products.filter((item) => item.quantity > 0).length} disponibles`} icon={Boxes} />
        <StatCard title="Valeur du stock" value={formatCFA(inventoryValue)} subtitle="Au prix de vente" icon={ShoppingBag} />
        <StatCard title="Alertes stock" value={String(lowStock.length + outOfStock.length)} subtitle={`${outOfStock.length} rupture(s)`} icon={AlertTriangle} variant="dark" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <SectionCard title={`${config.inventoryLabel} à surveiller`} description="Exemples de stock bijouterie.">
          <div className="divide-y">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{config.itemIcon}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.code} · {formatBusinessAttribute('jewelry', product.material_type)}</p>
                </div>
                <Badge variant={product.quantity > 3 ? 'default' : 'secondary'}>
                  Stock {product.quantity}
                </Badge>
              </div>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/products">Ouvrir le catalogue <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </SectionCard>

        <SectionCard title="Parcours métier" description="Bijouterie">
          <div className="space-y-3">
            {['Gérer matières et catégories', 'Suivre réservations et commandes', 'Contrôler les disponibilités'].map((label) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export const DemoModulePage = () => {
  const location = useLocation();
  const { config } = useBusiness();
  const module = location.pathname.includes('orders')
    ? 'Commandes'
    : location.pathname.includes('operations') ? 'Opérations'
      : location.pathname.includes('clients') ? 'Clients'
        : location.pathname.includes('receipts') ? 'Documents'
          : 'Paramètres';
  const Icon = ShoppingBag;
  const rows = module === 'Clients'
    ? [
        ['Aminata Diallo', '+221 77 000 11 22', 'Client actif', '125 000 FCFA'],
        ['Mamadou Fall', '+221 76 100 20 30', 'Client actif', '0 FCFA'],
        ['Sokhna Ba', '+221 78 300 40 50', 'À relancer', '48 500 FCFA'],
      ]
    : module === 'Opérations'
      ? [['Vente JW-0031', 'Alliance Or 18K', 'Payée', '178 500 FCFA'], ['Réservation', 'Collier Sira', 'Acompte reçu', '80 000 FCFA'], ['Entrée stock', 'Lot de 20 alliances', 'Terminée', '20 pièces']]
      : module === 'Commandes'
            ? [['CMD-0038', 'Alliance personnalisée', 'En fabrication', 'Prévue 30/07'], ['CMD-0037', 'Collier prénom', 'Prête', 'Solde 65 000'], ['CMD-0036', 'Bracelet Or 21K', 'Livrée', 'Terminée']]
            : module === 'Documents'
              ? [['REC-2026-0088', 'Reçu de vente', 'Aujourd’hui 14:32', '149 000 FCFA'], ['FAC-2026-0041', 'Facture', 'Hier 17:10', '86 000 FCFA'], ['BON-2026-0012', 'Bon de réservation', '23/07/2026', '80 000 FCFA']]
              : [['Bijouterie', config.typeLabel, 'Configuration active', 'Local'], ['Compte', 'Administrateur démo', 'Accès complet', 'Actif'], ['Stock', config.inventoryLabel, 'Données navigateur', 'Protégé']];

  const stats = module === 'Clients'
    ? [['Clients actifs', '38'], ['Soldes à recevoir', '173 500 FCFA'], ['Nouveaux ce mois', '6']]
    : module === 'Opérations'
      ? [['Ventes du jour', '7'], ['Encaissé', '725 000 FCFA'], ['À traiter', '2']]
      : module === 'Documents'
        ? [['Documents', '126'], ['Ce mois', '34'], ['À imprimer', '2']]
        : [['En cours', '3'], ['Terminés', '12'], ['À traiter', '2']];

  return (
    <div className="page-shell animate-fade-in">
      <PageHeader
        title={module}
        description={`${module} adaptés à ${config.typeLabel.toLowerCase()}. Données de démonstration locales.`}
        actions={<Button asChild><Link to="/products/add">Ajouter un {config.itemSingular}</Link></Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value], index) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-[#C9972A]">
                {index === 0 ? <Icon className="h-4 w-4" /> : index === 1 ? <PackageCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </span>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="mt-4 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Activité récente</h2>
            <p className="text-sm text-muted-foreground">Exemples représentatifs de ce module.</p>
          </div>
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="divide-y">
          {rows.map(([title, detail, status, value]) => (
            <div key={`${title}-${detail}`} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1.4fr_.8fr_.8fr] sm:items-center">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{detail}</p>
              <Badge variant="secondary" className="w-fit">{status}</Badge>
              <p className="text-sm font-semibold sm:text-right">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <span><strong>Démonstration locale :</strong> aucune donnée distante n’est créée.</span>
        <Button asChild variant="outline" size="sm"><Link to="/products">Consulter {config.inventoryLabel.toLowerCase()}</Link></Button>
      </div>
    </div>
  );
};
