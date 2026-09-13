import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CreditCard, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalAuth } from '@/contexts/AuthContext';

export default function SubscriptionExpiryBanner() {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isSuperAdmin = auth?.isSuperAdmin ?? false;
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage?.getItem('inventa-expiry-banner-dismissed') === 'true',
  );

  const subscription = user?.subscription;
  const expiresAt = subscription?.expiresAt ?? subscription?.trialEndsAt ?? null;
  const status = subscription?.status;

  const { daysRemaining, isExpired, isExpiringSoon } = useMemo(() => {
    if (!expiresAt || isSuperAdmin) {
      return { daysRemaining: null, isExpired: false, isExpiringSoon: false };
    }

    const diff = new Date(expiresAt).getTime() - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
    const expired = days <= 0 || status === 'expired' || status === 'past_due';
    const expiringSoon = !expired && days <= 5;

    return {
      daysRemaining: days,
      isExpired: expired,
      isExpiringSoon: expiringSoon,
    };
  }, [expiresAt, isSuperAdmin, status]);

  if (!isExpired && !isExpiringSoon) return null;
  if (dismissed && !isExpired && (daysRemaining ?? 0) > 1) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage?.setItem('inventa-expiry-banner-dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const formattedDate = expiresAt
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
      }).format(new Date(expiresAt))
    : '';

  return (
    <div
      role="alert"
      className={`relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors shadow-xs ${
        isExpired
          ? 'bg-red-600 text-white'
          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
          {isExpired ? (
            <ShieldAlert className="h-4 w-4 text-white" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-white" />
          )}
        </div>
        <p className="truncate text-xs sm:text-sm">
          {isExpired ? (
            <>
              <strong>Accès expiré :</strong> Votre abonnement a expiré{formattedDate ? ` le ${formattedDate}` : ''}. Renouvelez pour continuer vos opérations sans blocage.
            </>
          ) : (
            <>
              <strong>Échéance proche :</strong> Votre abonnement expire dans{' '}
              <span className="font-bold underline">
                {daysRemaining === 1 ? '1 jour' : `${daysRemaining} jours`}
              </span>
              {formattedDate ? ` (le ${formattedDate})` : ''}.
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <Button
          size="sm"
          onClick={() => void navigate('/subscription')}
          className="h-8 rounded-lg bg-white text-slate-900 hover:bg-white/90 font-bold text-xs shadow-sm transition-transform hover:scale-[1.02]"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
          Renouveler mon abonnement
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>

        {!isExpired && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fermer le rappel"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

