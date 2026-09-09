import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

const SectionCard = ({
  title,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) => (
  <section className={cn('overflow-hidden rounded-xl border bg-card card-shadow', className)}>
    {title || actions ? (
      <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          {title ? <h2 className="font-semibold">{title}</h2> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    ) : null}
    <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
  </section>
);

export default SectionCard;
