import { Diamond, CheckCircle2, TrendingUp, Users, Lock, Zap } from 'lucide-react';

interface Feature {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    id: 'stock',
    icon: Diamond,
    title: 'Gestion de Stock',
    description: 'Suivi en temps réel, alertes automatiques, historique complet. Votre stock n\'a jamais été aussi fiable.',
  },
  {
    id: 'clients',
    icon: Users,
    title: 'Clients & Dépôts',
    description: 'Fiches détaillées, historique des dépôts, relances automatiques. Zéro oubli, 100% de confiance client.',
  },
  {
    id: 'sales',
    icon: TrendingUp,
    title: 'Ventes & Factures',
    description: 'Génération en un clic, modèles personnalisables, tracking complet. Rapide et professionnel.',
  },
  {
    id: 'security',
    icon: Lock,
    title: 'Sécurité & Multi-Entreprises',
    description: 'Données chiffrées, isolation complète par entreprise, sauvegarde automatique quotidienne.',
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">
            Les 4 fonctionnalités qui changent tout
          </h2>
          <p className="text-lg text-muted-foreground">
            Conçues spécifiquement pour les bijouteries. Simples à utiliser, puissantes pour grandir.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="rounded-xl border border-border bg-card p-8 hover:border-gold/50 transition-colors"
              >
                <div className="rounded-lg bg-gold/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
