import { Diamond, CheckCircle2, TrendingUp, Users, Lock } from 'lucide-react';

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

export default function FeaturesSection() {
  return (
    <section id="features" className="py-[100px] lg:py-[140px] bg-[#F7F7F8]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="text-center max-w-[560px] mx-auto mb-16">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Les 4 fonctionnalités qui changent tout
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            Conçues spécifiquement pour les bijouteries. Simples à utiliser, puissantes pour grandir.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="bg-white rounded-2xl border border-[#E7E7EA] p-7 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] hover:border-[#C89B3C]/30 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-[#C89B3C]/10 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-[#C89B3C]" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#171717] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-[1.6] text-[#55555C]">
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
