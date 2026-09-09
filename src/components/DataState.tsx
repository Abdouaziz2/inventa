import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const ListSkeleton = ({ rows = 5, className }: { rows?: number; className?: string }) => (
  <div className={cn('space-y-3 p-4 sm:p-5', className)} aria-label="Chargement en cours">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);

export const QueryErrorState = ({
  onRetry,
  title = 'Impossible de charger les données',
}: {
  onRetry?: () => void;
  title?: string;
}) => (
  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
    <span className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
      <AlertTriangle className="h-5 w-5" />
    </span>
    <p className="font-semibold">{title}</p>
    {onRetry ? (
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" /> Réessayer
      </Button>
    ) : null}
  </div>
);

export const EmptyState = ({
  title,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
    <span className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
      <Inbox className="h-5 w-5" />
    </span>
    <p className="font-semibold">{title}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
