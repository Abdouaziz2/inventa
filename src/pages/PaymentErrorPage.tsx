import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
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
import { getPaymentStatus, type PaymentStatusResult } from '@/services/subscriptions';
import { getErrorMessage } from '@/lib/errors';

type State =
  | { kind: 'checking' }
  | { kind: 'done'; result: PaymentStatusResult }
  | { kind: 'error'; message: string };

function humanStatus(status?: string): string {
  switch (status) {
    case 'failed':
      return 'Paiement refusé';
    case 'cancelled':
      return 'Paiement annulé';
    case 'expired':
      return 'Paiement expiré';
    case 'processing':
      return 'Paiement en cours';
    default:
      return status ?? 'Statut inconnu';
  }
}

const PaymentErrorPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>({ kind: 'checking' });

  const clientReference = searchParams.get('ref') ?? undefined;
  const waveSessionId = searchParams.get('session') ?? undefined;

  const verify = useCallback(async () => {
    setState({ kind: 'checking' });
    try {
      const result = await getPaymentStatus({
        client_reference: clientReference,
        wave_session_id: waveSessionId,
      });
      setState({ kind: 'done', result });
    } catch (error) {
      setState({
        kind: 'error',
        message: getErrorMessage(error, 'Impossible de vérifier le paiement.'),
      });
    }
  }, [clientReference, waveSessionId]);

  useEffect(() => {
    if (loading || !user) return;
    void verify();
  }, [loading, user, verify]);

  if (!loading && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <ShieldAlert className="h-8 w-8 text-amber-600" />
            <CardTitle>Connexion requise</CardTitle>
            <CardDescription>
              Connectez-vous pour connaître le statut de votre paiement.
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

  const fetching = state.kind === 'checking';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-amber-200">
        <CardHeader className="items-center text-center">
          {fetching ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="h-7 w-7 text-amber-600" />
            </div>
          )}
          <CardTitle>{fetching ? 'Vérification…' : 'Paiement non abouti'}</CardTitle>
          <CardDescription>
            {state.kind === 'error'
              ? state.message
              : 'Le paiement n’a pas pu être confirmé. Aucun montant n’a été débité.'}
          </CardDescription>
        </CardHeader>

        {state.kind === 'done' && state.result.payment_status && (
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-background p-3">
              <span className="text-sm text-muted-foreground">Statut</span>
              <span className="text-sm font-medium">
                {humanStatus(state.result.payment_status)}
              </span>
            </div>
            {state.result.last_payment_error ? (
              <p className="text-center text-sm text-muted-foreground">
                {String(
                  (
                    state.result.last_payment_error as { reason?: unknown }
                  )?.reason ?? 'Paiement refusé par l’émetteur.',
                )}
              </p>
            ) : null}
          </CardContent>
        )}

        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button
            className="w-full"
            disabled={fetching}
            onClick={() => void navigate('/#pricing', { replace: true })}
          >
            Réessayer le paiement
          </Button>
          <Button className="w-full" variant="outline" disabled={fetching} onClick={() => void verify()}>
            <RefreshCw />
            Re-vérifier
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
};

export default PaymentErrorPage;