import { useState } from 'react';
import { Check, ArrowRight, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { startWaveCheckout, WAVE_PAYMENT_SUCCESS_FLAG } from '@/services/subscriptions';
import { WAVE_PLAN_MONTHLY, WAVE_PLAN_YEARLY, type WavePlanId } from '@/lib/wave';
import { getErrorMessage } from '@/lib/errors';

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Pour démarrer et structurer votre bijouterie.',
    features: [
      { text: 'Produits, stock, ventes' },
      { text: 'Gestion par poids' },
      { text: 'Clients' },
      { text: 'Alertes stock' },
      { text: 'Dashboard' },
      { text: '1 utilisateur' },
    ],
    cta: 'Commencer',
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Pour les bijouteries en pleine croissance.',
    popular: true,
    features: [
      { text: 'Tout Starter' },
      { text: 'Utilisateurs' },
      { text: 'Achats / fournisseurs' },
      { text: 'Réservations / encaissements' },
      { text: 'Rapports / statistiques' },
      { text: 'Export Excel / PDF' },
      { text: 'Historique des ventes' },
      { text: 'Support prioritaire' },
    ],
    cta: 'Commencer',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Pour les réseaux et multi-boutiques.',
    features: [
      { text: 'Tout Business' },
      { text: 'Multi-boutiques' },
      { text: 'Multi-utilisateurs' },
      { text: 'Rôles / permissions' },
      { text: 'Rapports financiers avancés' },
      { text: 'Gestion multi-sites' },
      { text: 'Sauvegardes avancées' },
      { text: 'Support prioritaire' },
    ],
    cta: 'Commencer',
  },
];

function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR').replace(/\s/g, ' ');
}

type PayState = 'idle' | 'processing' | 'error';

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [payStates, setPayStates] = useState<Record<string, PayState>>({});
  const [paymentError, setPaymentError] = useState('');
  const [recentSuccess, setRecentSuccess] = useState<string | null>(() =>
    window.localStorage.getItem(WAVE_PAYMENT_SUCCESS_FLAG),
  );
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = async (plan: Plan) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setPaymentError('');
    setPayStates((previous) => ({ ...previous, [plan.id]: 'processing' }));
    window.localStorage.removeItem(WAVE_PAYMENT_SUCCESS_FLAG);
    setRecentSuccess(null);

    try {
      const result = await startWaveCheckout({
        plan: plan.id as WavePlanId,
        frequency: isAnnual ? 'yearly' : 'monthly',
      });
      if (!result.wave_launch_url) {
        throw new Error('Wave n’a pas retourné de lien de paiement.');
      }
      window.location.href = result.wave_launch_url;
    } catch (error) {
      setPayStates((previous) => ({ ...previous, [plan.id]: 'error' }));
      setPaymentError(getErrorMessage(error, 'Impossible de lancer le paiement.'));
    }
  };

  const planAmount = (planId: string, annual: boolean) =>
    annual
      ? WAVE_PLAN_YEARLY[planId as WavePlanId]
      : WAVE_PLAN_MONTHLY[planId as WavePlanId];

  return (
    <section id="pricing" className="py-[100px] lg:py-[140px] bg-[#F7F7F8]">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-[36px] sm:text-[42px] font-bold leading-[1.12] tracking-[-0.02em] text-[#171717] mb-5">
            Tarification simple et transparente
          </h2>
          <p className="text-[17px] leading-[1.6] text-[#55555C] max-w-[520px] mx-auto mb-8">
            Choisissez le plan qui correspond à votre bijouterie. Changez ou annulez à tout moment.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full border border-[#E7E7EA] p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                !isAnnual
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'text-[#55555C] hover:text-[#171717]'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                isAnnual
                  ? 'bg-[#171717] text-white shadow-sm'
                  : 'text-[#55555C] hover:text-[#171717]'
              }`}
            >
              Annuel
            </button>
          </div>
          {isAnnual && (
            <p className="text-[13px] text-[#C89B3C] font-semibold mt-3">
              Économisez jusqu'à 2 mois
            </p>
          )}
        </div>

        {/* Success banner */}
        {recentSuccess && (
          <div className="mx-auto mb-10 max-w-[720px] rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-left">
              <p className="text-[15px] font-semibold text-emerald-800">
                Paiement réussi — votre abonnement est maintenant actif.
              </p>
              <p className="text-[13px] text-emerald-700 mt-0.5">
                Bienvenue dans votre espace Inventa. Vous pouvez commencer à utiliser toutes les
                fonctionnalités de votre plan.
              </p>
            </div>
            <Button
              className="ml-auto shrink-0 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => void navigate('/dashboard')}
            >
              Accéder à mon espace
            </Button>
          </div>
        )}

        {/* Error banner */}
        {paymentError && (
          <div className="mx-auto mb-10 max-w-[720px] rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div className="text-left">
              <p className="text-[15px] font-semibold text-red-800">Paiement échoué</p>
              <p className="text-[13px] text-red-700 mt-0.5">{paymentError}</p>
            </div>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-[1040px] mx-auto">
          {plans.map((plan) => {
            const monthly = WAVE_PLAN_MONTHLY[plan.id as WavePlanId];
            const yearly = WAVE_PLAN_YEARLY[plan.id as WavePlanId];
            const amount = isAnnual ? yearly : monthly;
            const state = payStates[plan.id] ?? 'idle';
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border p-7 sm:p-8 transition-all duration-300 flex flex-col ${
                  plan.popular
                    ? 'border-[#C89B3C] shadow-[0_8px_40px_-12px_rgba(200,155,60,0.2)]'
                    : 'border-[#E7E7EA] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)]'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-block px-4 py-1 bg-[#C89B3C] text-white text-[12px] font-semibold rounded-full tracking-wide">
                      Le plus populaire
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-[18px] font-semibold text-[#171717] mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-[14px] text-[#55555C]">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[14px] font-medium text-[#55555C]">FCFA</span>
                    <span className="text-[40px] font-bold text-[#171717] leading-none tracking-tight">
                      {formatPrice(Math.round(amount / (isAnnual ? 12 : 1)))}
                    </span>
                    <span className="text-[14px] text-[#55555C]">/mois</span>
                  </div>
                  {isAnnual && (
                    <p className="text-[13px] text-[#55555C] mt-1.5">
                      {formatPrice(yearly)} FCFA facturé annuellement
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Button
                  onClick={() => void handleGetStarted(plan)}
                  disabled={state === 'processing'}
                  className={`w-full h-11 rounded-[10px] font-semibold text-[14px] transition-colors duration-200 mb-7 ${
                    plan.popular
                      ? 'bg-[#C89B3C] hover:bg-[#A87920] text-white shadow-none'
                      : 'bg-[#171717] hover:bg-[#171717]/90 text-white shadow-none'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {state === 'processing' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Paiement en cours…
                      </>
                    ) : (
                      <>
                        {state === 'error' ? 'Réessayer' : plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </Button>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        plan.popular ? 'bg-[#C89B3C]/10' : 'bg-[#171717]/5'
                      }`}>
                        <Check className={`h-3 w-3 ${plan.popular ? 'text-[#C89B3C]' : 'text-[#171717]'}`} />
                      </div>
                      <span className="text-[14px] leading-[1.5] text-[#55555C]">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Trial notice */}
        <p className="text-center text-[14px] text-[#55555C] mt-10">
          Tous les plans incluent <span className="font-semibold text-[#171717]">14 jours d'essai gratuit</span>. Paiement sécurisé par Wave.
        </p>
      </div>
    </section>
  );
}
