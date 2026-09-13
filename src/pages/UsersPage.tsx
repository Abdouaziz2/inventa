import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Loader2, Mail, Plus, Search, ShieldCheck, UserRound, X } from 'lucide-react';
import { CheckCircle2, Clock3, Loader2, Mail, Plus, Search, ShieldCheck, UserRound, X, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PaymentReminderModal, { type PaymentReminderTarget } from '@/components/PaymentReminderModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { useUpdateSubscription } from '@/hooks/useSubscriptions';
import type { SubscriptionStatus } from '@/types/api';

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  company_name: string;
  subscription_status: SubscriptionStatus | null;
  expires_at: string | null;
  phone?: string;
  amount?: number | null;
};

type AccessRequestRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  company_name: string;
  status: 'pending' | 'approved' | 'rejected';
  notified_at: string | null;
  created_at: string;
};

const usersKey = ['admin-users'] as const;
const accessRequestsKey = ['access-requests'] as const;

async function fetchUsers(): Promise<UserRow[]> {
  const [{ data: profiles, error: profileError }, { data: subscriptions, error: subscriptionError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at, company_id, phone')
        .order('created_at', { ascending: false }),
      supabase
        .from('subscriptions')
        .select('user_id, status, expires_at, amount'),
    ]);

  if (profileError) throw profileError;
  if (subscriptionError) throw subscriptionError;

  const companyIds = [...new Set((profiles ?? []).map((profile) => profile.company_id).filter(Boolean))];
  const { data: companies, error: companyError } = companyIds.length
    ? await supabase.from('companies').select('id, name').in('id', companyIds)
    : { data: [], error: null };

  if (companyError) throw companyError;

  const companyById = new Map((companies ?? []).map((company) => [company.id, company.name]));
  const subscriptionByUser = new Map((subscriptions ?? []).map((subscription) => [subscription.user_id, subscription]));

  return (profiles ?? []).map((profile) => {
    const subscription = subscriptionByUser.get(profile.id);
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      is_active: profile.is_active,
      created_at: profile.created_at,
      company_name: profile.company_id ? companyById.get(profile.company_id) ?? '' : '',
      subscription_status: (subscription?.status as SubscriptionStatus | undefined) ?? null,
      expires_at: subscription?.expires_at ?? null,
      phone: profile.phone ?? '',
      amount: subscription?.amount ?? null,
    };
  });
}

const UsersPage = () => {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const updateSubscription = useUpdateSubscription();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<PaymentReminderTarget | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    activateNow: true,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: usersKey,
    queryFn: fetchUsers,
    enabled: isSuperAdmin,
  });
  const { data: accessRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: accessRequestsKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_requests')
        .select('id, user_id, email, full_name, company_name, status, notified_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AccessRequestRow[];
    },
    enabled: isSuperAdmin,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          full_name: form.fullName,
          company_name: form.companyName,
          email: form.email,
          password: form.password,
          activate_now: form.activateNow,
          business_type: 'jewelry',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersKey }),
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
      ]);
      setDialogOpen(false);
      setForm({ fullName: '', companyName: '', email: '', password: '', activateNow: true });
      toast.success('Utilisateur créé');
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Création impossible')),
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('access-requests', {
        body: { action, request_id: requestId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { email_sent?: boolean };
    },
    onSuccess: async (data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessRequestsKey }),
        queryClient.invalidateQueries({ queryKey: usersKey }),
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
      ]);
      const actionLabel = variables.action === 'approve' ? 'acceptée' : 'refusée';
      toast.success(
        data.email_sent
          ? `Demande ${actionLabel}, email envoyé`
          : `Demande ${actionLabel}. Email non configuré`,
      );
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'Traitement impossible')),
  });

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.full_name} ${user.email} ${user.company_name}`.toLowerCase().includes(term),
    );
  }, [search, users]);
  const pendingRequests = accessRequests.filter((request) => request.status === 'pending');

  const setAccess = async (user: UserRow, enabled: boolean) => {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    try {
      await updateSubscription.mutateAsync({
        userId: user.id,
        status: enabled ? 'active' : 'suspended',
        expiresAt: enabled ? expiresAt.toISOString() : null,
      });
      await queryClient.invalidateQueries({ queryKey: usersKey });
      toast.success(enabled ? 'Accès activé' : 'Accès bloqué');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise à jour impossible'));
    }
  };

  if (!isSuperAdmin) {
    return <div className="p-8 text-center text-muted-foreground">Accès réservé au super-administrateur.</div>;
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Utilisateurs</h1>
          {pendingRequests.length > 0 ? (
            <Badge className="gold-gradient text-accent-foreground">
              {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''}
            </Badge>
          ) : null}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-[#C9972A]" />
            <h2 className="font-semibold">Demandes d’accès</h2>
          </div>
          <span className="text-sm text-muted-foreground">{pendingRequests.length}</span>
        </div>
        {requestsLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune demande en attente</div>
        ) : (
          <div className="divide-y">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{request.full_name || 'Sans nom'}</p>
                  <p className="truncate text-sm text-muted-foreground">{request.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {request.company_name || 'Bijouterie non renseignée'} ·{' '}
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(request.created_at))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => reviewRequest.mutate({ requestId: request.id, action: 'reject' })}
                    disabled={reviewRequest.isPending}
                  >
                    <X className="h-4 w-4" />
                    Refuser
                  </Button>
                  <Button
                    onClick={() => reviewRequest.mutate({ requestId: request.id, action: 'approve' })}
                    disabled={reviewRequest.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accepter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div>
        <h2 className="font-semibold">Tous les comptes</h2>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Nom, email ou bijouterie..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Aucun utilisateur</div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user) => {
              const hasAccess = ['active', 'trialing'].includes(user.subscription_status ?? '');
              return (
                <div key={user.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    {user.role === 'super_admin' ? <ShieldCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold">{user.full_name || 'Sans nom'}</p>
                      <Badge variant={hasAccess ? 'default' : 'secondary'}>
                        {hasAccess ? 'Actif' : 'En attente'}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    {user.company_name ? <p className="truncate text-xs text-muted-foreground">{user.company_name}</p> : null}
                  </div>
                  {user.role !== 'super_admin' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-500/40 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1.5"
                        onClick={() =>
                          setReminderTarget({
                            id: user.id,
                            email: user.email,
                            fullName: user.full_name,
                            companyName: user.company_name,
                            phone: user.phone,
                            expiresAt: user.expires_at,
                            subscriptionStatus: user.subscription_status,
                            amount: user.amount,
                          })
                        }
                      >
                        <BellRing className="h-3.5 w-3.5 text-amber-600" />
                        Rappel
                      </Button>
                      <Button
                        variant={hasAccess ? 'outline' : 'default'}
                        onClick={() => void setAccess(user, !hasAccess)}
                        disabled={updateSubscription.isPending}
                      >
                        {hasAccess ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        {hasAccess ? 'Bloquer' : 'Valider'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel utilisateur</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createUser.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-name">Nom complet</Label>
                <Input id="user-name" required minLength={2} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-company">Boutique</Label>
                <Input id="user-company" required minLength={2} value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Mot de passe temporaire</Label>
              <Input id="user-password" type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="activate-user">Activer immédiatement</Label>
              <Switch id="activate-user" checked={form.activateNow} onCheckedChange={(checked) => setForm({ ...form, activateNow: checked })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <PaymentReminderModal
        open={!!reminderTarget}
        onOpenChange={(open) => !open && setReminderTarget(null)}
        target={reminderTarget}
      />
    </div>
  );
};

export default UsersPage;
