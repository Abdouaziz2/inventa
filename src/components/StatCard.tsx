import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: 'default' | 'gold' | 'dark';
}

const StatCard = ({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) => {
  return (
    <div className={cn(
      "rounded-xl p-5 card-shadow transition-all duration-200 hover:card-shadow-hover",
      variant === 'default' && "bg-card",
      variant === 'gold' && "gold-gradient text-primary",
      variant === 'dark' && "bg-primary text-primary-foreground"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            variant === 'default' && "text-muted-foreground",
            variant === 'gold' && "text-primary/70",
            variant === 'dark' && "text-primary-foreground/70"
          )}>{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-xs",
              variant === 'default' && "text-muted-foreground",
              variant === 'gold' && "text-primary/60",
              variant === 'dark' && "text-primary-foreground/60"
            )}>{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-lg",
          variant === 'default' && "bg-muted",
          variant === 'gold' && "bg-primary/10",
          variant === 'dark' && "bg-primary-foreground/10"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
