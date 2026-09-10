import { AlertTriangle, FileSpreadsheet, Clock, Frown } from 'lucide-react';

const painPoints = [
  {
    icon: FileSpreadsheet,
    title: 'Outils fragmentés',
    description: 'Vous jonglez entre Excel, cahiers papier, messages clients et votre système de caisse. Chaque jour, vous perdez des heures à saisir des données deux fois.',
  },
  {
    icon: AlertTriangle,
    title: 'Erreurs chroniques',
    description: 'Stock mal à jour, clients perdus, dépôts oubliés, factures manuelles. Les erreurs s\'accumulent et minent votre crédibilité.',
  },
  {
    icon: Clock,
    title: 'Temps perdu',
    description: 'Chercher une fiche client, vérifier le stock, calculer un solde de dépôt. Des tâches qui devraient prendre secondes vous coûtent des heures.',
  },
  {
    icon: Frown,
    title: 'Croissance difficile',
    description: 'Quand vous grandissez, la coordination devient un cauchemar. Les solutions existantes sont compliquées, chères et demandent semaines de mise en place.',
  },
];

export default function ProblemSection() {
  return (
    <section className="py-[100px] lg:py-[140px] bg-[#F7F7F8]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="max-w-[640px] mb-16">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Le vrai problème des bijouteries aujourd'hui
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            La plupart des bijoutiers perdent du temps et de l'argent à cause d'outils inadaptés. Voici ce que vous vivez probablement chaque jour.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {painPoints.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="bg-white rounded-2xl border border-[#E7E7EA] p-7 sm:p-8 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-[#C89B3C]/10 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-[#C89B3C]" />
                </div>
                <h3 className="text-[18px] font-semibold text-[#171717] mb-2">
                  {point.title}
                </h3>
                <p className="text-[15px] leading-[1.6] text-[#55555C]">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
