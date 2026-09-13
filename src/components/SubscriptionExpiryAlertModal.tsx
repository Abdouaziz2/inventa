import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  PhoneCall,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { buildWaveMerchantUrl } from '@/services/subscriptions';

export default function SubscriptionExpiryAlertModal() {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const isSuperAdmin = auth?.isSuperAdmin ?? false;
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage?.getItem('inventa-expiry-popup-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const subscription = user?.subscription;
  const expiresAt = subscription?.expiresAt ?? subscription?.trialEndsAt ?? null;
  const status = subscription?.status;
  const amount = subscription?.amount && subscription.amount > 0 ? subscription.amount : 11500;

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
  if (dismissed && !isExpired) return null;

  const formattedDate = expiresAt
    ? new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
      }).format(new Date(expiresAt))
    : '';

  const formattedAmount = `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
  const waveUrl = buildWaveMerchantUrl(amount);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage?.setItem('inventa-expiry-popup-dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleGoToSubscription = () => {
    handleDismiss();
    navigate('/subscription');
  };

  const handleOpenWavePayment = () => {
    window.open(waveUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open={!dismissed || isExpired}
      onOpenChange={(open) => {
        if (!open && !isExpired) {
          handleDismiss();
        }
      }}
    >
      <DialogContent
        className={`sm:max-w-lg border-2 ${
          isExpired ? 'border-red-500' : 'border-amber-500'
        }`}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-full ${
                  isExpired
                    ? 'bg-red-100 text-red-600 dark:bg-red-950/50'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'
                }`}
              >
                {isExpired ? (
                  <ShieldAlert className="h-6 w-6 text-red-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <Badge variant={isExpired ? 'destructive' : 'default'} className="text-xs">
                {isExpired ? 'Abonnement expiré' : `Plus que ${daysRemaining} jour${(daysRemaining ?? 0) > 1 ? 's' : ''}`}
              </Badge>
            </div>
          </div>

          <DialogTitle className="text-xl font-bold">
            {isExpired
              ? 'Votre abonnement Inventa a expiré'
              : 'Renouvellement imminent de votre abonnement'}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            {isExpired ? (
              <span>
                La période d'accès pour votre bijouterie{' '}
                <strong>{user?.businessName || 'votre établissement'}</strong> est arrivée à
                échéance le <strong>{formattedDate}</strong>.
              </span>
            ) : (
              <span>
                Votre abonnement pour votre bijouterie{' '}
                <strong>{user?.businessName || 'votre établissement'}</strong> arrive à échéance
                le <strong>{formattedDate}</strong> (dans <strong>{daysRemaining} jour{(daysRemaining ?? 0) > 1 ? 's' : ''}</strong>).
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Amount Box */}
          <div className="rounded-xl border bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Montant du renouvellement
                </p>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {formattedAmount}
                </p>
              </div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/10 font-medium">
                Offre {subscription?.planCode ? subscription.planCode.toUpperCase() : 'BUSINESS'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Renouvelez dès maintenant pour continuer à piloter vos stocks, vos ventes, vos dépôts d'or et vos reçus sans interruption.
            </p>
          </div>

          {/* Quick Support Contact */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-primary" />
              Support client & assistance :
            </span>
            <a
              href="https://wa.me/221772406874"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              +221 77 240 68 74 (WhatsApp)
            </a>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:space-x-0">
          {!isExpired ? (
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              Me le rappeler plus tard
            </Button>
          ) : (
            <span />
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoToSubscription}
              className="w-full sm:w-auto gap-1.5"
            >
              <CreditCard className="h-4 w-4" />
              Gérer mon abonnement
            </Button>

            <Button
              type="button"
              onClick={handleOpenWavePayment}
              className="w-full sm:w-auto gap-1.5 bg-[#1DA1F2] hover:bg-[#0d8ddb] text-white font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              Payer avec Wave ({formattedAmount})
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

