import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 'trial',
    question: 'L\'essai gratuit est-il vraiment gratuit ?',
    answer: 'Oui. Vous bénéficiez de 14 jours d\'accès complet à toutes les fonctionnalités du plan choisi, sans carte bancaire. À la fin de l\'essai, vous pouvez choisir de vous abonner ou de passer à un plan inférieur.',
  },
  {
    id: 'change-plan',
    question: 'Puis-je changer de plan à tout moment ?',
    answer: 'Absolument. Vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis votre espace client. Le changement est effectif immédiatement et la facturation est ajustée au prorata.',
  },
  {
    id: 'annual',
    question: 'Comment fonctionne la facturation annuelle ?',
    answer: 'En choisissant la facturation annuelle, vous payez l\'intégralité de l\'année d\'avance et bénéficiez d\'une réduction équivalente à environ 2 mois gratuits par rapport au tarif mensuel.',
  },
  {
    id: 'users',
    question: 'Combien d\'utilisateurs puis-je ajouter ?',
    answer: 'Le plan Starter autorise 1 utilisateur. Le plan Business permet d\'ajouter des utilisateurs supplémentaires. Le plan Premium offre un nombre illimité d\'utilisateurs avec des rôles et permissions configurables.',
  },
  {
    id: 'data',
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Oui. Toutes les données sont chiffrées et stockées sur des serveurs sécurisés avec sauvegarde automatique quotidienne. Vous pouvez exporter vos données à tout moment.',
  },
  {
    id: 'support',
    question: 'Quel support est inclus ?',
    answer: 'Tous les plans incluent un support par email. Les plans Business et Premium bénéficient d\'un support prioritaire avec temps de réponse garanti. Le support est disponible du lundi au samedi.',
  },
  {
    id: 'cancel',
    question: 'Puis-je annuler mon abonnement ?',
    answer: 'Oui, annulation possible en 1 clic depuis votre espace client. Vous conservez l\'accès jusqu\'à la fin de la période de facturation en cours. Aucun engagement, aucune pénalité.',
  },
  {
    id: 'multi-shop',
    question: 'Le plan Premium gère-t-il plusieurs boutiques ?',
    answer: 'Oui. Le plan Premium est spécialement conçu pour les réseaux de bijouteries. Il permet de gérer plusieurs boutiques, sites et équipes depuis un seul tableau de bord, avec des rôles et permissions par site.',
  },
];

export default function FAQSection() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="py-[100px] lg:py-[140px] bg-white">
      <div className="mx-auto max-w-[720px] px-5 sm:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Questions fréquentes
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C]">
            Tout ce que vous devez savoir sur Inventa et ses tarifs.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqItems.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`border rounded-2xl transition-colors duration-200 ${
                  isOpen ? 'border-[#C89B3C]/30 bg-[#F7F7F8]' : 'border-[#E7E7EA] bg-white'
                }`}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-[#171717]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#55555C] transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-[14px] leading-[1.65] text-[#55555C]">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
