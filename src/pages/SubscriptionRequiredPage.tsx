import { CalendarClock, LogOut, RefreshCw, ShieldX } from 'lucide-react';
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

const statusLabels = {
  trialing: 'Période d’essai expirée',
  active: 'Abonnement expiré',
  past_due: 'Paiement en attente',
  suspended: 'Compte suspendu',
  canceled: 'Abonnement résilié',
} as const;

const SubscriptionRequiredPage = () => {
  const { user, logout, refreshUser, loading } = useAuth();
  const status = user?.subscription?.status;
  const expiresAt = user?.subscription?.expiresAt;
  const title = status ? statusLabels[status] : 'Aucun abonnement actif';

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg border-amber-200 shadow-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <ShieldX className="h-7 w-7 text-amber-700" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            L’accès à Gems Flow Suite est associé au compte {user?.email}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {expiresAt && (
            <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date de fin</p>
                <p className="text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  }).format(new Date(expiresAt))}
                </p>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Contactez l’administrateur pour renouveler l’abonnement, puis actualisez votre accès.
          </p>
        </CardContent>

        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button className="w-full" onClick={() => void refreshUser()} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin' : ''} />
            Vérifier mon accès
          </Button>
          <Button className="w-full" variant="outline" onClick={() => void logout()}>
            <LogOut />
            Se déconnecter
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
};

export default SubscriptionRequiredPage;
