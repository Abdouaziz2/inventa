import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState, ListSkeleton, QueryErrorState } from '@/components/DataState';
import { supabase } from '@/lib/supabase';

type AuditLogRow = {
  id: number;
  actor_id: string | null;
  table_name: string;
  record_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  created_at: string;
};

const tableLabels: Record<string, string> = {
  sales: 'Ventes',
  sale_items: 'Articles vendus',
  payments: 'Paiements',
  deposits: 'Dépôts',
  wallet_transactions: 'Soldes clients',
  reservations: 'Réservations',
  stock_movements: 'Mouvements de stock',
  buybacks: 'Retours',
  sale_returns: 'Remboursements',
  customer_orders: 'Commandes',
};

const actionLabels = {
  INSERT: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
} as const;

async function fetchAuditLogs() {
  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('id, actor_id, table_name, record_id, action, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const rows = (logs ?? []) as AuditLogRow[];
  const actorIds = [...new Set(rows.map((log) => log.actor_id).filter((id): id is string => !!id))];
  const { data: actors, error: actorsError } = actorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    : { data: [], error: null };

  if (actorsError) throw actorsError;

  const actorById = new Map((actors ?? []).map((actor) => [actor.id, actor.full_name]));
  return rows.map((log) => ({
    ...log,
    actorName: log.actor_id ? actorById.get(log.actor_id) ?? 'Utilisateur' : 'Système',
  }));
}

const AuditLogsPage = () => {
  const [search, setSearch] = useState('');
  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: fetchAuditLogs,
  });

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      `${tableLabels[log.table_name] ?? log.table_name} ${actionLabels[log.action]} ${log.actorName}`
        .toLowerCase()
        .includes(term),
    );
  }, [logs, search]);

  return (
    <div className="page-shell animate-fade-in">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-[#C9972A]" />
        <h1 className="page-title">Journal d’activité</h1>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher une action..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <QueryErrorState title="Impossible de charger le journal" onRetry={() => void refetch()} />
        ) : filteredLogs.length === 0 ? (
          <EmptyState title="Aucune activité trouvée" />
        ) : (
          <div className="divide-y">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{tableLabels[log.table_name] ?? log.table_name}</p>
                    <Badge variant={log.action === 'DELETE' ? 'destructive' : 'secondary'}>
                      {actionLabels[log.action]}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{log.actorName}</p>
                </div>
                <time className="text-xs text-muted-foreground" dateTime={log.created_at}>
                  {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(log.created_at))}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
