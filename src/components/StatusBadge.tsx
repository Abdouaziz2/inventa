import { cn } from '@/lib/utils';
import { JewelryStatus } from '@/types';

interface StatusBadgeProps {
  status: JewelryStatus;
  className?: string;
}

const statusConfig: Record<JewelryStatus, { label: string; className: string }> = {
  available: { label: 'Disponible', className: 'bg-success/10 text-success border-success/20' },
  reserved: { label: 'Réservé', className: 'bg-warning/10 text-warning border-warning/20' },
  sold: { label: 'Vendu', className: 'bg-muted text-muted-foreground border-border' },
  out_of_stock: { label: 'Rupture', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
