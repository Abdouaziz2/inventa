import { CheckCircle2, Lock, TrendingUp, Users, Zap } from 'lucide-react';

interface FeatureItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    id: 'centralize',
    icon: Zap,
    title: 'Centralisez tout',
    description: 'Stock, clients, ventes, dépôts, réservations. Plus d\'éparpillement, plus de recherche. Tout est là, en un seul endroit.',
  },
  {
    id: 'eliminate-errors',
    icon: CheckCircle2,
    title: 'Éliminez les erreurs',
    description: 'Stock automatiquement mis à jour, calculs fiables, traçabilité complète. Plus d\'imprévus à la fin du mois.',
  },
  {
    id: 'save-time',
    icon: TrendingUp,
    title: 'Gagnez du temps',
    description: 'Factures générées en un clic, stock synchronisé automatiquement. Vous reprenez 15 heures par semaine.',
  },
  {
    id: 'manage-clients',
    icon: Users,
    title: 'Gérez vos clients',
    description: 'Historique complet, préférences, dépôts en cours. Offrez un service premium sans effort.',
  },
];

export default function SolutionSection() {
  return (
    <section className="py-[100px] lg:py-[140px] bg-white">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-[640px] mb-16">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Voilà comment <span className="text-[#C89B3C]">Inventa</span> résout ça
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            Une seule plateforme pour gérer tout ce qui compte vraiment. Simple à apprendre, rapide à mettre en place, conçue spécifiquement pour les bijouteries.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group bg-[#F7F7F8] rounded-2xl p-7 sm:p-8 hover:bg-white hover:border-[#E7E7EA] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] border border-transparent transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[#C89B3C]/10 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-[#C89B3C]" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#171717] mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-[#55555C]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
