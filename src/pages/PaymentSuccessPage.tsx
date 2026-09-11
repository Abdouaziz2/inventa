import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPaymentStatus,
  WAVE_PAYMENT_SUCCESS_FLAG,
  type PaymentStatusResult,
} from '@/services/subscriptions';
import { formatCFA } from '@/lib/format';
import { WAVE_PLAN_NAMES, type WavePlanId } from '@/lib/wave';
import { getErrorMessage } from '@/lib/errors';

type VerificationState =
  | { kind: 'checking'; attempt: number }
  | { kind: 'active'; result: PaymentStatusResult }
  | { kind: 'pending'; result: PaymentStatusResult }
  | { kind: 'failed'; result: PaymentStatusResult }
  | { kind: 'error'; message: string };

const MAX_ATTEMPTS = 4;
const ATTEMPT_DELAY = 1500;

function planLabel(planCode?: string): string {
  return planCode ? (WAVE_PLAN_NAMES[planCode as WavePlanId] ?? planCode) : '';
}

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useAuth();
  const [state, setState] = useState<VerificationState>({ kind: 'checking', attempt: 0 });
  const timerRef = useRef<number | null>(null);

  const clientReference = searchParams.get('ref') ?? undefined;
  const waveSessionId = searchParams.get('session') ?? undefined;

  const verify = useCallback(
    async (iteration: number) => {
      setState({ kind: 'checking', attempt: iteration });
      try {
        const result = await getPaymentStatus({
          client_reference: clientReference,
          wave_session_id: waveSessionId,
        });

        if (result.activated) {
          window.localStorage.setItem(WAVE_PAYMENT_SUCCESS_FLAG, result.plan_code ?? '1');
          void refreshUser();
          setState({ kind: 'active', result });
        } else if (result.payment_status === 'succeeded') {
          if (iteration < MAX_ATTEMPTS) {
            timerRef.current = window.setTimeout(() => {
              void verify(iteration + 1);
            }, ATTEMPT_DELAY);
          } else {
            setState({ kind: 'pending', result });
          }
        } else if (['failed', 'cancelled', 'expired'].includes(result.payment_status ?? '')) {
          setState({ kind: 'failed', result });
        } else {
          setState({ kind: 'pending', result });
        }
      } catch (error) {
        setState({
          kind: 'error',
          message: getErrorMessage(error, 'Impossible de vérifier le paiement.'),
        });
      }
    },
    [clientReference, waveSessionId, refreshUser],
  );

  useEffect(() => {
    if (loading || !user) return;
    void verify(0);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [loading, user, verify]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Connectez-vous pour vérifier et activer votre abonnement.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/login" className="w-full">
              <Button className="w-full">Se connecter</Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    );
  }

  if (state.kind === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <CardTitle>Vérification du paiement en cours</CardTitle>
            <CardDescription>
              Nous confirmons votre paiement auprès de Wave. Cela peut prendre quelques
              secondes.
              {state.attempt > 0 && ` (tentative ${state.attempt})`}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  if (state.kind === 'active') {
    const result = state.result;
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-emerald-200">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle>Paiement réussi</CardTitle>
            <CardDescription>
              Votre abonnement {planLabel(result.plan_code) || ''} est maintenant actif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium">{planLabel(result.plan_code)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Montant</span>
              <span className="text-sm font-medium">
                {formatCFA(Number(result.amount ?? 0))}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Période</span>
              <span className="text-sm font-medium">
                {result.frequency === 'yearly' ? 'Annuel' : 'Mensuel'}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => void navigate('/dashboard', { replace: true })}>
              Accéder à mon espace
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  if (state.kind === 'pending') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <CardTitle>Paiement reçu, activation en cours</CardTitle>
            <CardDescription>
              Votre paiement a bien été reçu. L’activation de votre abonnement est en cours.
              Vous pouvez vérifier à nouveau dans quelques instants.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2 sm:flex-row">
            <Button className="w-full" onClick={() => void verify(0)}>
              <RefreshCw />
              Vérifier à nouveau
            </Button>
            <Link to="/" className="w-full">
              <Button className="w-full" variant="outline">
                Retour aux tarifs
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    );
  }

  if (state.kind === 'failed') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md border-amber-200">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            </div>
            <CardTitle>Paiement non abouti</CardTitle>
            <CardDescription>
              Le paiement n’a pas été confirmé. Aucun montant n’a été débité, et votre
              abonnement n’a pas été modifié.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2 sm:flex-row">
            <Button className="w-full" onClick={() => void navigate('/#pricing', { replace: true })}>
              Réessayer le paiement
            </Button>
            <Link to="/" className="w-full">
              <Button className="w-full" variant="outline">
                Retour à l’accueil
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <CardTitle>Vérification impossible</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => void verify(0)}>
            <RefreshCw />
            Réessayer
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
};

export default PaymentSuccessPage;