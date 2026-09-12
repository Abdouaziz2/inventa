import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  LogOut,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanCatalogue } from '@/hooks/usePlans';
import {
  formatMoney,
  isLiveSubscription,
  isTrialOver,
  nextRecommendedPlan,
  planDisplayName,
  trialDaysRemaining,
  type PlanConfig,
} from '@/lib/plans';
import type { PlanFrequency, WavePlanId } from '@/lib/wave';
import { getErrorMessage } from '@/lib/errors';
import { publicAsset } from '@/lib/assets';
import { startWaveCheckout, WAVE_PAYMENT_SUCCESS_FLAG } from '@/services/subscriptions';

const statusMeta: Record<string, { label: string; tone: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  trialing: { label: 'Essai gratuit', tone: 'secondary' },
  active: { label: 'Actif', tone: 'default' },
  past_due: { label: 'Impayé', tone: 'destructive' },
  suspended: { label: 'En attente', tone: 'outline' },
  canceled: { label: 'Résilié', tone: 'destructive' },
  expired: { label: 'Expiré', tone: 'destructive' },
};

const currencyLabel = (currency: string) => (currency.toUpperCase() === 'XOF' ? 'FCFA' : currency);

export default function MySubscriptionPage() {
  const navigate = useNavigate();
  const { user, logout, hasAccess, isAdmin } = useAuth();
  const { data: catalogue, isLoading: catalogueLoading } = usePlanCatalogue();
  const [isAnnual, setIsAnnual] = useState(false);
  const [payState, setPayState] = useState<string | null>(null);

  const subscription = user?.subscription ?? null;
  const currentCode = subscription?.planCode ?? null;
  const currentStatus = subscription?.status ?? null;
  const expiresAt = subscription?.expiresAt ?? null;
  const trialEndsAt = subscription?.trialEndsAt ?? expiresAt;

  const activePlans = useMemo(
    () => (catalogue?.plans ?? []).filter((plan) => plan.active),
    [catalogue],
  );

  const recommended = useMemo(
    () => nextRecommendedPlan(catalogue ?? { plans: [], currency: 'XOF', trialEnabled: true, trialDurationDays: 14 }, currentCode),
    [catalogue, currentCode],
  );

  const live = isLiveSubscription(currentStatus, expiresAt);
  const trialOver = isTrialOver(currentStatus, trialEndsAt);
  const daysLeft = trialDaysRemaining(trialEndsAt);
  const trialTotal = catalogue?.trialDurationDays ?? 14;
  const trialProgress =
    trialTotal > 0 ? Math.min(100, Math.max(0, Math.round((daysLeft / trialTotal) * 100))) : 0;

  const pay = async (plan: PlanConfig, frequency: PlanFrequency) => {
    if (!user) {
      navigate('/login');
      return;
    }
    const key = `${plan.code}:${frequency}`;
    setPayState(key);
    window.localStorage.removeItem(WAVE_PAYMENT_SUCCESS_FLAG);
    try {
      const result = await startWaveCheckout({ plan: plan.code as WavePlanId, frequency });
      if (!result.wave_launch_url) throw new Error('Wave n’a pas retourné de lien de paiement.');
      window.location.href = result.wave_launch_url;
    } catch (error) {
      setPayState(null);
      toast.error(getErrorMessage(error, 'Impossible de lancer le paiement.'));
    }
  };

  const ctaFor = (plan: PlanConfig): { label: string; disabled: boolean } => {
    const frequency: PlanFrequency = isAnnual ? 'yearly' : 'monthly';
    if (!live) return { label: currentStatus === 'trialing' || currentStatus === 'expired' ? 'Choisir ce plan' : 'Souscrire', disabled: false };
    if (currentCode !== plan.code) return { label: 'Passer à ce plan', disabled: false };
    if (subscription?.frequency === frequency) return { label: 'Votre plan actuel', disabled: true };
    if (subscription?.frequency === 'yearly') return { label: 'Passer en mensuel', disabled: false };
    return { label: 'Passer en annuel', disabled: false };
  };

  return (
    <main className="min-h-screen bg-[#F7F7F8]">
      <header className="flex h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <img src={publicAsset('inventa-icon.png')} alt="" className="h-9 w-9 rounded-lg" />
          <div>
            <p className="font-semibold leading-tight">Mon abonnement</p>
            {user && <p className="max-w-56 truncate text-xs text-muted-foreground">{user.email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasAccess && (
            <Button variant="ghost" onClick={() => void navigate('/dashboard')}>
              <ArrowLeft />
              Espace
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" onClick={() => void navigate('/subscriptions')}>
              <CreditCard />
              Console
            </Button>
          )}
          <Button variant="ghost" onClick={() => void logout()}>
            <LogOut />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!live && (
          <Card className="mb-6 border-amber-200">
            <CardContent className="flex items-start gap-3 p-4 sm:p-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {currentStatus === 'trialing' || currentStatus === 'expired'
                    ? 'Votre période d’essai est terminée.'
                    : 'Votre accès est bloqué.'}
                </p>
                <p className="text-sm text-amber-700/80">
                  Choisissez un abonnement ci-dessous pour retrouver l’accès à Inventa.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              Situation actuelle
              <Badge variant={statusMeta[currentStatus ?? '']?.tone ?? 'outline'}>
                {statusMeta[currentStatus ?? '']?.label ?? 'Aucun abonnement'}
              </Badge>
            </CardTitle>
            <CardDescription>
              Plan : {planDisplayName(catalogue ?? undefined, currentCode)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStatus === 'trialing' && !trialOver ? (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-[#C89B3C]" />
                  Il vous reste <span className="font-semibold text-foreground">{daysLeft} jour{daysLeft > 1 ? 's' : ''}</span> d’essai
                </div>
                <div className="h-2 w-full max-w-72 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#C89B3C]"
                    style={{ width: `${trialProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                {expiresAt ? (
                  <>
                    {live ? 'Renouvellement le' : 'Expiration le'}{' '}
                    <span className="font-semibold text-foreground">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(expiresAt))}
                    </span>
                  </>
                ) : (
                  'Durée illimitée'
                )}
              </div>
            )}

            {subscription?.frequency && subscription.amount ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                {formatMoney(subscription.amount)} {currencyLabel('XOF')} ·{' '}
                {subscription.frequency === 'yearly' ? 'annuel' : 'mensuel'}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold">Choisissez votre abonnement</h2>
          {catalogue?.trialEnabled && (
            <p className="mt-1 text-sm text-muted-foreground">
              Chaque plan inclut {catalogue.trialDurationDays} jours d’essai gratuit.
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-[#E7E7EA] bg-white p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                !isAnnual ? 'bg-[#171717] text-white' : 'text-[#55555C] hover:text-[#171717]'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                isAnnual ? 'bg-[#171717] text-white' : 'text-[#55555C] hover:text-[#171717]'
              }`}
            >
              Annuel
            </button>
          </div>
        </div>

        {catalogueLoading && activePlans.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Chargement des offres...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {activePlans.map((plan) => {
              const price = plan.prices[isAnnual ? 'yearly' : 'monthly'];
              const frequency: PlanFrequency = isAnnual ? 'yearly' : 'monthly';
              const isCurrent = live && currentCode === plan.code;
              const cta = ctaFor(plan);
              const processing = payState === `${plan.code}:${frequency}`;
              return (
                <div
                  key={plan.code}
                  className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-all ${
                    plan.recommended
                      ? 'border-[#C89B3C] shadow-[0_8px_40px_-12px_rgba(200,155,60,0.2)]'
                      : 'border-[#E7E7EA]'
                  }`}
                >
                  {plan.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#C89B3C] px-3 py-1 text-xs font-semibold text-white">
                      Le plus populaire
                    </span>
                  )}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    )}
                  </div>
                  <div className="mb-5 flex items-baseline gap-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {currencyLabel(catalogue?.currency ?? 'XOF')}
                    </span>
                    <span className="text-4xl font-bold tracking-tight">
                      {price ? formatMoney(isAnnual ? Math.round(price.amount / 12) : price.amount) : '—'}
                    </span>
                    <span className="text-sm text-muted-foreground">/mois</span>
                  </div>
                  {isAnnual && price && (
                    <p className="-mt-3 mb-5 text-xs text-muted-foreground">
                      {formatMoney(price.amount)} {currencyLabel(catalogue?.currency ?? 'XOF')} facturé annuellement
                    </p>
                  )}
                  <div className="mb-5 space-y-1.5">
                    {recommended?.code === plan.code && (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-[#C89B3C]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommandé pour vous
                      </p>
                    )}
                    {isCurrent && (
                      <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Votre plan actuel
                      </p>
                    )}
                  </div>
                  <Button
                    className={`w-full ${plan.recommended ? 'bg-[#C89B3C] hover:bg-[#A87920] text-white' : ''}`}
                    disabled={cta.disabled || processing || !price}
                    onClick={() => void pay(plan, frequency)}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {cta.label}
                        {!cta.disabled && <ArrowRight className="h-4 w-4" />}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-emerald-500" />
          Paiement sécurisé par Wave. Sans engagement, changez de plan à tout moment.
        </p>
      </div>
    </main>
  );
}