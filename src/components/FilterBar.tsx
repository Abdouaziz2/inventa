import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FilterBar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('rounded-xl border bg-card p-3 card-shadow sm:p-4', className)}>{children}</div>
);

export default FilterBar;
