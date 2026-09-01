import { CheckCircle2, Lock, TrendingUp, Users, Zap } from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
}

const features: FeatureItem[] = [
  {
    id: 'centralize',
    icon: Zap,
    title: 'Centralisez tout',
    description: 'Stock, clients, ventes, dépôts, réservations. Plus d\'éparpillement, plus de recherche. Tout est là, en un seul endroit.',
    bgColor: 'bg-gold/10',
    iconColor: 'text-gold'
  },
  {
    id: 'eliminate-errors',
    icon: CheckCircle2,
    title: 'Élimine les erreurs',
    description: 'Stock automatiquement mis à jour, calculs fiables, traçabilité complète. Plus d\'imprévus à la fin du mois.',
    bgColor: 'bg-success/10',
    iconColor: 'text-success'
  },
  {
    id: 'save-time',
    icon: TrendingUp,
    title: 'Gagnez du temps',
    description: 'Factures générées en un clic, stock synchronisé automatiquement. Vous reprenez 15 heures par semaine.',
    bgColor: 'bg-info/10',
    iconColor: 'text-info'
  },
  {
    id: 'manage-clients',
    icon: Users,
    title: 'Gérez vos clients',
    description: 'Historique complet, préférences, dépôts en cours. Offrez un service premium sans effort.',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary'
  }
];

export const SolutionSection = () => {
  return (
    <section className="py-20 bg-primary/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <h2 className="text-4xl font-display font-bold mb-4">
            Voilà comment <span className="text-gold">Inventa</span> résout ça
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Une seule plateforme pour gérer tout ce qui compte vraiment. Simple à apprendre, rapide à mettre en place, conçue spécifiquement pour les bijouteries.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.id} className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-lg ${feature.bgColor} p-3 mt-1`}>
                      <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
