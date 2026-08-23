import { useMemo, useState } from 'react';
import { CalendarPlus, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeleteUser, useSubscriptions, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { getErrorMessage } from '@/lib/errors';
import type { SubscriptionStatus } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusLabels: Record<SubscriptionStatus, string> = {
  trialing: 'Essai',
  active: 'Actif',
  past_due: 'Impayé',
  suspended: 'Suspendu',
  canceled: 'Résilié',
};

const activeStatuses: SubscriptionStatus[] = ['trialing', 'active'];

const SubscriptionsPage = () => {
  const [search, setSearch] = useState('');
  const { isSuperAdmin, user } = useAuth();
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const updateSubscription = useUpdateSubscription();
  const deleteUser = useDeleteUser();
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  const filteredSubscriptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return subscriptions;
    return subscriptions.filter((subscription) =>
      subscription.email.toLowerCase().includes(normalizedSearch),
    );
  }, [search, subscriptions]);

  const update = async (
    userId: string,
    status: SubscriptionStatus,
    expiresAt: string | null,
    renewFromCurrent = false,
  ) => {
    try {
      await updateSubscription.mutateAsync({ userId, status, expiresAt, renewFromCurrent });
      toast.success('Abonnement mis à jour');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise à jour impossible'));
    }
  };

  const monthlyExpiry = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const extend = (userId: string, currentExpiry: string | null, days: number) => {
    const currentDate = currentExpiry ? new Date(currentExpiry) : new Date();
    const baseDate = currentDate.getTime() > Date.now() ? currentDate : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    void update(userId, 'active', baseDate.toISOString(), true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast.success('Utilisateur supprimé');
      setUserToDelete(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Suppression impossible'));
    }
  };

  return (
    <div className="page-shell animate-fade-in">
      <div>
        <h1 className="page-title">Abonnements</h1>
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? 'Gérez l’accès à l’application pour chaque adresse e-mail.'
            : 'Consultez l’état de votre abonnement et sa date de renouvellement.'}
        </p>
      </div>

      {isSuperAdmin && (
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un e-mail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-card card-shadow">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Aucun compte trouvé</div>
        ) : (
          <div className="divide-y">
            {filteredSubscriptions
              .filter((subscription) => isSuperAdmin || subscription.user_id === user?.id)
              .map((subscription) => {
              const isExpired =
                !!subscription.expires_at &&
                new Date(subscription.expires_at).getTime() <= Date.now();
              const hasAccess = activeStatuses.includes(subscription.status) && !isExpired;

              return (
                <div
                  key={subscription.user_id}
                  className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{subscription.email}</p>
                      <Badge variant={hasAccess ? 'default' : 'destructive'}>
                        {hasAccess ? 'Accès autorisé' : 'Accès bloqué'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {subscription.expires_at
                        ? `Fin : ${new Intl.DateTimeFormat('fr-FR', {
                            dateStyle: 'medium',
                          }).format(new Date(subscription.expires_at))}`
                        : 'Sans date de fin'}
                    </p>
                  </div>

                  {isSuperAdmin && (
                  <div className="grid gap-2 sm:grid-cols-[160px_1fr] lg:flex">
                    <Select
                      value={subscription.status}
                      onValueChange={(value: SubscriptionStatus) =>
                        void update(
                          subscription.user_id,
                          value,
                          value === 'active' ? monthlyExpiry() : subscription.expires_at,
                        )
                      }
                    >
                      <SelectTrigger className="w-full lg:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([status, label]) => (
                          <SelectItem key={status} value={status}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          extend(subscription.user_id, subscription.expires_at, 30)
                        }
                      >
                        <CalendarPlus />
                        +30 jours
                      </Button>
                      <Button
                        onClick={() =>
                          extend(subscription.user_id, subscription.expires_at, 365)
                        }
                      >
                        <ShieldCheck />
                        +1 an
                      </Button>
                      {subscription.user_id !== user?.id && (
                        <Button
                          variant="destructive"
                          aria-label={`Supprimer ${subscription.email}`}
                          onClick={() => setUserToDelete({ id: subscription.user_id, email: subscription.email })}
                        >
                          <Trash2 />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte {userToDelete?.email} et son accès à Inventa seront supprimés définitivement.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteUser.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionsPage;
